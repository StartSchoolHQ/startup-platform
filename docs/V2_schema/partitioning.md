# Partitioning Strategy

Four append-only tables in V2 grow without bound: `transactions`, `activity_events`, `notifications`, `audit_log`. Retrofitting partitioning at 50M+ rows requires `pg_partman` migration with table-swap dance — measured in hours of operational pain. Doing it on day one is essentially free.

This doc specifies the partitioning approach. Apply at migration #1.

---

## Tables that MUST be partitioned at V2 launch

| Table | Strategy | Key | Partition span | Reason |
|---|---|---|---|---|
| `transactions` | RANGE | `created_at` | 1 month | hottest write table; lifetime retention |
| `activity_events` | RANGE | `occurred_at` | 1 month | high volume; 1-year retention (see [retention.md](retention.md)) |
| `notifications` | RANGE | `created_at` | 1 month | aggressive 90-day retention; partition pruning makes cleanup a `DROP TABLE` |
| `audit_log` | RANGE | `created_at` | 1 month | already largest table at current scale; 180-day hot retention then archive |

Other tables — `weekly_reports`, `absences`, `client_meetings`, etc. — are bounded enough that partitioning would just add operational overhead. Don't.

---

## Why monthly?

| Span | Pros | Cons |
|---|---|---|
| Daily | finest pruning | 365 partitions/year per table — planner overhead |
| **Monthly** | sweet spot — 12 partitions/year, query planner is fine, retention cleanup is one DROP per month | — |
| Quarterly | fewer partitions | retention granularity is too coarse — 90 days = whole partition gone |
| Yearly | minimal partitions | `DROP TABLE` on a year of data is too lossy for `notifications` 90-day TTL |

Monthly is what every Postgres-at-scale playbook converges on for time-series writes. Stick with it.

---

## DDL pattern

Each partitioned table is declared with the partition strategy at CREATE time, then partitions are added by a cron-like maintenance job.

```sql
-- Example: transactions
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  -- … all other columns …
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)         -- partition key MUST be in PK
) PARTITION BY RANGE (created_at);

-- NO default partition. We deliberately omit it so that an INSERT for a date with no
-- matching named partition FAILS LOUDLY. A failed insert pages an admin within minutes
-- (Sentry on the failed RPC); a silent-fill default partition rots for weeks.
-- The maintain_partitions cron runs weekly and creates next month's partition with
-- ample lead time (~3 weeks); failure to create a partition is itself an alert path.

-- Initial partition for the launch month
CREATE TABLE public.transactions_2026_05
  PARTITION OF public.transactions
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Indexes are declared on the parent — propagate automatically
CREATE INDEX ON public.transactions (user_id, created_at DESC);
CREATE INDEX ON public.transactions (team_id, created_at DESC) WHERE team_id IS NOT NULL;
-- … etc per spec …
```

### Notes on the PRIMARY KEY change

Postgres requires the partition key to be part of the PK. So `transactions.id` becomes `(id, created_at)` composite. This affects FK targets:

- Tables that FK INTO `transactions` (e.g. `team_task_reviews.transaction_id`) cannot easily reference `(id, created_at)` without also storing the timestamp. Two options:
  1. **Soft FK** (recommended): `transaction_id uuid` with no FK constraint; document the soft reference. The polymorphic source pattern already does this for some cross-references.
  2. Store both: `transaction_id uuid, transaction_created_at timestamptz`, FK on the pair. More columns, stronger guarantee.

V2 picks **soft FK** for transaction references — same approach the polymorphic `source_table`/`source_id` pattern uses. The `audit_orphan_polymorphic_sources` job catches dangling refs.

---

## Partition maintenance — the cron job

A weekly cron creates the NEXT month's partition before it's needed.

```sql
CREATE OR REPLACE FUNCTION public.maintain_partitions() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_table text;
  v_next_start date := date_trunc('month', now() + interval '1 month')::date;
  v_next_end   date := (v_next_start + interval '1 month')::date;
  v_part_name  text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['transactions', 'activity_events', 'notifications', 'audit_log']
  LOOP
    v_part_name := format('%s_%s', v_table, to_char(v_next_start, 'YYYY_MM'));
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES FROM (%L) TO (%L)',
      v_part_name, v_table, v_next_start, v_next_end
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.maintain_partitions() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.maintain_partitions() TO service_role;
```

**Schedule:** weekly via Supabase pg_cron. Idempotent (`CREATE TABLE IF NOT EXISTS`).

---

## Why declarative range vs `pg_partman`

`pg_partman` is great but adds an extension dependency and an admin schema. For four tables on monthly RANGE, the manual `maintain_partitions` function is ~20 lines and zero dependencies. If we ever add ~10 more partitioned tables, swap to `pg_partman`. Right now: not worth it.

---

## Retention via DROP

Retention policy lives in [retention.md](retention.md). The retention cron drops old partitions:

```sql
-- e.g. retain 90 days of notifications
DROP TABLE IF EXISTS public.notifications_2026_02;
```

Dropping a partition is **constant time** regardless of row count — the win that justifies partitioning in the first place. A `DELETE WHERE created_at < …` on a non-partitioned 5M-row table takes minutes and bloats the heap; `DROP TABLE` takes milliseconds and reclaims space immediately.

---

## Indexes on partitioned tables

Postgres 12+ propagates indexes declared on the parent to all current and future partitions automatically. Just declare them on the parent:

```sql
CREATE INDEX ON public.transactions (user_id, created_at DESC);
```

No need to repeat per partition. Same for partial indexes, expression indexes, GIN indexes.

**Caveat:** UNIQUE constraints on partitioned tables must include the partition key. If you need `UNIQUE (some_natural_key)` across all rows, you can't have it — use a non-unique index plus an INSERT trigger that checks. None of the V2 partitioned tables need cross-partition UNIQUE.

---

## Migration order at launch

1. Create the four tables `PARTITION BY RANGE (created_at)`.
2. Create the launch-month partition for each (NO default partition — see "What we explicitly do NOT do").
3. Create indexes on the parent (propagate to current and future partitions).
4. Create RLS policies on the parent (propagate).
5. Schedule `maintain_partitions()` weekly with **3-week lead time** — i.e. it creates the partition for `now() + 3 weeks` not `now() + 1 month`. Lead time is what saves you if a single weekly run fails.
6. Sentry alert on `maintain_partitions` job failure (don't let it fail silently).
7. Schedule retention drops monthly (see [retention.md](retention.md)).

## Recovery if maintain_partitions fails

The cron has 3 weeks of headroom — one missed run is harmless. Two missed runs is still recoverable. **At three missed runs (~3 weeks without intervention)**, an INSERT for the next month with no matching partition will start failing. This is loud, not silent.

To recover from a fully missed window:

```sql
-- Manually create the missing partition. Idempotent.
CREATE TABLE IF NOT EXISTS public.transactions_2026_06
  PARTITION OF public.transactions
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Repeat for the other partitioned tables.
```

If somehow rows ended up unpartitioned (impossible without a default — but defense in depth): check `pg_partition_tree('public.transactions')` shows the missing month.

---

## What we explicitly do NOT do

| Choice | Why we don't |
|---|---|
| Partition by `cohort_id` | Most queries are time-bounded; cohort archival is a once-per-program event handled by the `cohort_id` snapshot column on each row, not by physical partitioning |
| Partition by `user_id` (hash) | Doesn't help retention, and breaks time-range queries which are the hot path |
| Sub-partition (e.g. month + cohort) | Operational complexity not justified at our scale |
| Partition `weekly_reports`, `absences`, etc. | They grow linearly but slowly (~520k/yr at 10k users for weekly_reports); single-table planner is fine |
| **Default partition** | Silent-fill = silent rot. Without it, missing partitions cause loud INSERT failures that page admins. With 3-week cron lead time, the failure mode is "1-3 weeks of warning" rather than "discover at retention drop time that 3 months of data are stuck in default." |
