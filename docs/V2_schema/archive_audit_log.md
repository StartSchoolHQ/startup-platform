# `audit_log` Cold Archive

`audit_log` retention policy ([retention.md](retention.md)) keeps 180 days hot, then archives to cold storage (Supabase Storage / S3) before dropping the partition. This doc specifies the automation so the archive step doesn't rot.

The flow uses three components:
1. A **cron RPC** (`enqueue_audit_log_archive`) that posts to a queue table when partitions are eligible
2. A **queue table** (`partition_archive_queue`) tracking export status
3. A **Supabase Edge Function** that consumes the queue, exports the partition, uploads, and calls a final DROP RPC

Postgres handles steps 1 and 3 (DROP). The Edge Function handles `pg_dump` + Storage upload — operations that should not run inside the database transaction.

---

## `partition_archive_queue` table

Small bookkeeping table — one row per partition that needs archiving.

### Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `table_name` | text | NO | — | source table, e.g. `'audit_log'` |
| `partition_name` | text | NO | — | e.g. `'audit_log_2026_05'` |
| `partition_start` | date | NO | — | inclusive |
| `partition_end` | date | NO | — | exclusive |
| `status` | enum `partition_archive_status` | NO | `'queued'` | `queued`, `exporting`, `uploaded`, `dropped`, `failed` |
| `storage_path` | text | YES | — | Supabase Storage path after upload |
| `storage_bucket` | text | YES | — | typically `'audit-archive'` |
| `checksum_sha256` | text | YES | — | hex of upload checksum |
| `bytes_uploaded` | bigint | YES | — | |
| `error_message` | text | YES | — | populated on `failed` |
| `enqueued_at` | timestamptz | NO | `now()` | |
| `started_at` | timestamptz | YES | — | when Edge Function picked it up |
| `uploaded_at` | timestamptz | YES | — | |
| `dropped_at` | timestamptz | YES | — | |

### Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| UNIQUE | `(table_name, partition_name)` — one queue entry per partition ever |
| CHECK | `(status = 'uploaded') = (uploaded_at IS NOT NULL AND storage_path IS NOT NULL AND checksum_sha256 IS NOT NULL)` |
| CHECK | `(status = 'dropped') = (dropped_at IS NOT NULL)` |
| CHECK | `(status = 'failed') = (error_message IS NOT NULL)` |

### Indexes

| Index | Purpose |
|---|---|
| `(status, enqueued_at)` WHERE `status IN ('queued', 'exporting', 'failed')` | Edge Function picks the next job |

### RLS

| Operation | Policy |
|---|---|
| SELECT | admins only |
| All writes | service_role only (cron + Edge Function) |

---

## Cron flow

### `enqueue_audit_log_archive()` `[cron]` — runs monthly

```sql
CREATE OR REPLACE FUNCTION public.enqueue_audit_log_archive() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r record;
  v_start date;
  v_end date;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename ~ '^audit_log_\d{4}_\d{2}$'
  LOOP
    -- Parse partition_start from the name "audit_log_2026_05" → 2026-05-01
    v_start := to_date(substring(r.tablename FROM '\d{4}_\d{2}'), 'YYYY_MM');
    v_end   := (v_start + interval '1 month')::date;

    -- Only enqueue partitions older than 180 days
    IF v_end < (now() - interval '180 days') THEN
      INSERT INTO public.partition_archive_queue (
        table_name, partition_name, partition_start, partition_end
      )
      VALUES ('audit_log', r.tablename, v_start, v_end)
      ON CONFLICT (table_name, partition_name) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_audit_log_archive() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.enqueue_audit_log_archive() TO service_role;
```

### `archive_audit_log_partition(p_partition_name text)` `[internal]` — called by Edge Function

```sql
CREATE OR REPLACE FUNCTION public.archive_audit_log_partition(p_partition_name text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_queue_id uuid;
  v_status partition_archive_status;
BEGIN
  -- Verify the queue entry is in 'uploaded' state
  SELECT id, status INTO v_queue_id, v_status
    FROM public.partition_archive_queue
    WHERE table_name = 'audit_log' AND partition_name = p_partition_name
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no queue entry for %', p_partition_name;
  END IF;

  IF v_status <> 'uploaded' THEN
    RAISE EXCEPTION 'partition % not in uploaded state (status=%)', p_partition_name, v_status;
  END IF;

  -- Verify partition is older than 180 days (defense in depth)
  IF (SELECT partition_end FROM public.partition_archive_queue WHERE id = v_queue_id)
       >= (now() - interval '180 days') THEN
    RAISE EXCEPTION 'partition % is younger than 180 days', p_partition_name;
  END IF;

  -- Drop the partition
  EXECUTE format('DROP TABLE IF EXISTS public.%I', p_partition_name);

  UPDATE public.partition_archive_queue
    SET status = 'dropped', dropped_at = now()
    WHERE id = v_queue_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_audit_log_partition(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.archive_audit_log_partition(text) TO service_role;
```

---

## Vercel Cron consumer (TypeScript)

Runs as a Vercel Cron route (Node.js runtime — has full networking, no Deno subprocess constraints, no `pg_dump` binary needed). Triggered every 15 minutes; no-ops if queue is empty.

The export uses **JSONL streaming via standard SQL** (`COPY (SELECT row_to_json(t) FROM partition t) TO STDOUT`), not `pg_dump`. JSONL is:
- Restorable via standard Postgres `COPY ... FROM` with a `to_jsonb` insert
- Compact and grep-able for audit lookups
- Streamable (no need to load the whole partition into memory)
- Independent of binary tooling

```typescript
// app/api/cron/archive-audit-log/route.ts (Vercel Cron route)
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { createHash } from "crypto";

export const runtime = "nodejs";   // not edge — needs pg client + streaming
export const maxDuration = 300;    // 5 min cap per invocation

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  // Vercel Cron auth
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }

  // 1. Pick the next queued job
  const { data: job, error: pickErr } = await supabase
    .from("partition_archive_queue")
    .select("*")
    .eq("status", "queued")
    .order("enqueued_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (pickErr) throw pickErr;
  if (!job) return new Response("no work");

  // 2. Mark exporting
  await supabase
    .from("partition_archive_queue")
    .update({ status: "exporting", started_at: new Date().toISOString() })
    .eq("id", job.id);

  const pg = new Client({ connectionString: process.env.SUPABASE_DIRECT_DB_URL });
  await pg.connect();

  try {
    // 3. Stream the partition as JSONL via COPY (no pg_dump dependency)
    //    Each row is one JSON object on its own line — easy to grep, easy to restore.
    const sql = `COPY (SELECT row_to_json(t) FROM public."${job.partition_name}" t) TO STDOUT`;
    const stream = pg.query(new (require("pg-copy-streams").to)(sql));

    const chunks: Buffer[] = [];
    const hash = createHash("sha256");
    let bytes = 0;
    for await (const chunk of stream) {
      chunks.push(chunk);
      hash.update(chunk);
      bytes += chunk.length;
    }
    const body = Buffer.concat(chunks);

    // 4. Upload to Supabase Storage (private bucket)
    const storagePath = `${job.table_name}/${job.partition_name}.jsonl`;
    const { error: uploadErr } = await supabase.storage
      .from("audit-archive")
      .upload(storagePath, body, {
        upsert: false,
        contentType: "application/x-ndjson",
      });
    if (uploadErr) throw uploadErr;

    // 5. Mark uploaded
    await supabase
      .from("partition_archive_queue")
      .update({
        status: "uploaded",
        storage_bucket: "audit-archive",
        storage_path: storagePath,
        bytes_uploaded: bytes,
        checksum_sha256: hash.digest("hex"),
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // 6. Call DROP RPC (which verifies upload state before dropping)
    const { error: dropErr } = await supabase.rpc("archive_audit_log_partition", {
      p_partition_name: job.partition_name,
    });
    if (dropErr) throw dropErr;

    return new Response(`archived ${job.partition_name}`);
  } catch (err) {
    await supabase
      .from("partition_archive_queue")
      .update({ status: "failed", error_message: String(err) })
      .eq("id", job.id);
    // Sentry catches the throw automatically (Vercel + Sentry integration)
    throw err;
  } finally {
    await pg.end();
  }
}
```

Dependencies: `pg`, `pg-copy-streams`, `@supabase/supabase-js` — all standard npm packages, all work in Vercel's Node runtime. No native binaries.

Vercel cron config in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/archive-audit-log", "schedule": "0 */15 * * *" }
  ]
}
```

Env vars required (set in Vercel project):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (used for queue + Storage + RPC)
- `SUPABASE_DIRECT_DB_URL` (direct connection — bypasses pooler so COPY works correctly)
- `CRON_SECRET` (Vercel generates; protects the route from external invocation)

### Why JSONL not SQL dump

| Format | Pros | Cons |
|---|---|---|
| `pg_dump` SQL | direct restore via psql | requires binary; tied to specific PG version |
| **JSONL via COPY** | runtime-agnostic; tiny restore script (`COPY t FROM jsonb`); grep-able | restore needs a few-line script, not a one-liner |

JSONL wins for our use case — the archive is for compliance audit lookups, not bulk restore. If we ever need to restore, the script is ~10 lines.

### Restore (if ever needed)

```sql
-- Recreate the partition table
CREATE TABLE public.audit_log_2026_05
  PARTITION OF public.audit_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Stream the JSONL back from Storage (e.g. via a one-off psql session)
\copy (SELECT * FROM jsonb_populate_recordset(NULL::public.audit_log,
       (SELECT jsonb_agg(line::jsonb) FROM (SELECT line FROM ...) s))) TO ...;
```

In practice: download the JSONL from Storage, parse it line by line, INSERT into the recreated partition. ~10 line script.

---

## Operations

### Storage bucket

Private Supabase Storage bucket named `audit-archive`. Access via service_role only. Admin-only signed-URL flow if anyone needs to read an old archive.

### Recovery

If a partition needs to be re-imported:
1. Download from Storage: `audit-archive/audit_log/audit_log_2026_05.sql`
2. Recreate the partition: `CREATE TABLE public.audit_log_2026_05 PARTITION OF public.audit_log FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');`
3. `psql ... -f audit_log_2026_05.sql`

### Monitoring

| Signal | Action |
|---|---|
| `partition_archive_queue` has rows in `'failed'` for >24 hours | Sentry alert; investigate |
| `partition_archive_queue` has rows in `'queued'` for >7 days | Edge Function isn't running; alert |
| Bytes_uploaded sum grows >50% per quarter | Audit_log volume growing faster than expected; review what's being logged |

### Cost

At 10k users × 10 GB/yr `audit_log` = ~5 GB/180 days → 5 GB per archived partition. Supabase Storage Pro tier includes 100GB; archive consumption ~30 GB/yr. Trivial.

---

## What this doc is NOT

- A complete deploy guide for the Edge Function (use Supabase docs)
- A backup policy — Supabase Pro PITR + daily backups handle live data
- A GDPR / data-deletion-on-request flow (separate concern)
