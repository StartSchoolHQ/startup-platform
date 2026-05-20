# Retention Policy

What to keep forever, what to expire, and how. Companion to [partitioning.md](partitioning.md) — partitioning is the *mechanism* that makes retention cheap; this doc is the *policy*.

---

## Per-table policy

| Table | Retention | Mechanism | Why |
|---|---|---|---|
| `transactions` | **forever** | none — append-only, partitioned monthly for query perf | financial-style ledger; every reward / penalty / reversal is permanent audit trail |
| `user_balances` | live | rebuilt from transactions on demand via `audit_recompute_user_caches` | not retained — derived state |
| `users.data` | forever | none | identity row; soft-disable via `status` |
| `auth.users` | forever | Supabase-managed | login identity |
| `cohorts` | forever | soft-archive via `status` | program history |
| `activity_events` | **365 days** | DROP partitions older than 12 months | user timeline; older history is in `transactions` (which is permanent) |
| `notifications` | **90 days** | DROP partitions older than 3 months | ephemeral by nature; user has either acted on it or it's stale |
| `audit_log` | **180 days hot, then archive to S3** | DROP partitions after 6 months; export to S3 / Supabase Storage cold tier | row-level diffs; rarely queried but compliance-relevant |
| `weekly_reports` | **forever** | none | program engagement record per cohort |
| `team_task_progress` | **forever** | none | bounded by template count × team count; small at scale |
| `team_task_reviews` | **forever** | none | review history is part of the audit trail |
| `individual_task_progress` | **forever** | none | bounded |
| `*_milestone_unlocks` | **forever** | none | small + audit-relevant |
| `*_journey` | **forever** | none | one row per user/team per stage; tiny |
| `team_invitations` | **forever** | soft via status | can re-invite later; full history visible |
| `team_strikes` | **forever** | soft-revoke via `revoked_at` | reputation history |
| `client_meetings` | **forever** | none | program activity record |
| `revenue_streams` | **forever** | none | bragging rights stay permanent |
| `absences` | **2 years** | DELETE WHERE absent_on < now() - interval '2 years' | personal attendance; older than 2 years has no operational use |
| `support_tickets` | **2 years** | DELETE resolved/closed older than 2y | support history; PII trim |
| `task_edit_suggestions` | **forever** | none | small volume, useful audit |
| `system_config` | forever | none | active config |

---

## The retention cron

Three jobs run on a schedule, each `[cron]` SECURITY DEFINER, service_role only.

### `drop_old_partitions()` — monthly

Drops partitions of `transactions`, `activity_events`, `notifications`, `audit_log` past their retention window. Constant-time per partition.

```sql
CREATE OR REPLACE FUNCTION public.drop_old_partitions() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      schemaname,
      tablename,
      CASE
        WHEN tablename ~ '^notifications_'   AND substring(tablename from '\d{4}_\d{2}')::date < now() - interval '90 days'  THEN true
        WHEN tablename ~ '^activity_events_' AND substring(tablename from '\d{4}_\d{2}')::date < now() - interval '365 days' THEN true
        WHEN tablename ~ '^audit_log_'       AND substring(tablename from '\d{4}_\d{2}')::date < now() - interval '180 days' THEN true
        -- transactions: never dropped
      END AS should_drop
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename ~ '^(notifications|activity_events|audit_log)_\d{4}_\d{2}$'
  LOOP
    IF r.should_drop THEN
      EXECUTE format('DROP TABLE %I.%I', r.schemaname, r.tablename);
    END IF;
  END LOOP;
END;
$$;
```

**Schedule:** monthly, after `maintain_partitions()`.

### `expire_notifications()` — daily (within current partition)

Some notifications expire before the partition does (`expires_at` set explicitly). Soft-delete by setting `read_at = now()` and dropping at partition time. Or hard delete in chunks.

```sql
CREATE OR REPLACE FUNCTION public.expire_notifications() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Hard-delete expired notifications in chunks to avoid long locks
  LOOP
    WITH dead AS (
      SELECT id, created_at
      FROM public.notifications
      WHERE expires_at IS NOT NULL AND expires_at < now()
      LIMIT 5000
    )
    DELETE FROM public.notifications n
    USING dead
    WHERE n.id = dead.id AND n.created_at = dead.created_at;
    EXIT WHEN NOT FOUND;
    PERFORM pg_sleep(0.1);  -- breathe
  END LOOP;
END;
$$;
```

### `delete_old_absences()` and `delete_old_resolved_tickets()` — monthly

Plain DELETEs in chunks for the small bounded tables.

```sql
DELETE FROM public.absences
WHERE absent_on < now() - interval '2 years';

DELETE FROM public.support_tickets
WHERE status IN ('resolved', 'closed')
  AND closed_at < now() - interval '2 years';
```

---

## Cold archive for `audit_log`

After 180 days of hot retention, `audit_log` partitions are exported to Supabase Storage (or S3) before being dropped. Implementation outline:

1. `pg_dump --table=public.audit_log_2026_05 --data-only --column-inserts > audit_log_2026_05.sql`
2. Upload to a private Storage bucket `audit-archive/`
3. Verify upload checksum
4. `DROP TABLE public.audit_log_2026_05`

This is a manual or scripted operation done once a month. At ~10 GB/year for `audit_log` at 10k users, S3 costs are trivial and we keep the trail compliant.

---

## What about cohort-end archival?

When a cohort completes its program, its data **stays** in V2 — alumni access, future re-enrollment, historical reporting. The `cohort_id` snapshot on every append-only row makes future "snapshot this cohort to cold storage" possible without joins, but it's not standard retention; it's a deliberate operation if/when needed.

Don't auto-archive cohort data. Cohorts are not high-volume entities and the long tail is valuable.

---

## Pre-launch checklist

- [ ] Each retention cron exists as a SECURITY DEFINER function with REVOKE/GRANT to service_role only
- [ ] Each is registered with Supabase `pg_cron` on the documented schedule
- [ ] `audit_log` archive script lives in the ops repo (not run from DB)
- [ ] Sentry alert if any retention job errors (don't silently fail)
- [ ] Monthly review of partition count per table — should never exceed retention-window months + 2

---

## What this document is NOT

- Not a backup policy. Supabase Pro handles point-in-time recovery and daily backups separately.
- Not a GDPR/data-subject-rights doc. User-deletion-on-request is a separate operation that touches multiple tables (cascade on `users.data` + scrub jsonb fields). Out of scope here.
- Not a per-cohort archival doc. See above — cohort data stays.
