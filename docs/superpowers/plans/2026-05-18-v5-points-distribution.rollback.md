# V5 Rollback Procedure

If V5 distribution causes a regression and we need to revert.

## A) Stop the V5 distributor (fast rollback, keeps history intact)

Apply a migration that points `submit_external_peer_review` back at the original `distribute_team_rewards`. The only change is the single line that selects the distributor — everything else stays identical.

1. Open the live function body via `mcp__supabase__execute_sql`:
   ```sql
   select pg_get_functiondef(oid) as def from pg_proc where proname = 'submit_external_peer_review';
   ```
2. Replace `SELECT distribute_team_rewards_v2(...)` with `SELECT distribute_team_rewards(...)`.
3. Apply via `mcp__supabase__apply_migration` with name `v5_rollback_to_v1` and the patched function body.

New approvals after that revert to V1 behavior (split-only, no upmark). The V2 transactions already in the table remain — only future behavior changes.

## B) Undo the inflation grants (full undo)

To remove the one-shot inflation entirely:

```sql
-- TAKE A BACKUP FIRST, then run as a single transaction:
BEGIN;

WITH grants AS (
  SELECT id, user_id, points_change, xp_change
  FROM transactions
  WHERE type = 'admin_grant'
    AND description LIKE 'V5 distribution rebalance%'
)
UPDATE users u
SET total_points = total_points - g.points_change,
    total_xp = total_xp - g.xp_change,
    updated_at = NOW()
FROM grants g
WHERE g.user_id = u.id;

DELETE FROM transactions
WHERE type = 'admin_grant'
  AND description LIKE 'V5 distribution rebalance%';

COMMIT;
```

## C) Verify rollback

```sql
-- Should return 0 rows
SELECT COUNT(*) FROM transactions
WHERE type = 'admin_grant'
  AND description LIKE 'V5 distribution rebalance%';

-- Spot-check known affected users
SELECT name, total_points, total_xp FROM users
WHERE name IN ('Gints Turlajs','Martins Mozga','Erik Babra');
-- Expected: Gints ~7249, Martins ~3976, Erik ~3888 (matches pre-V5 snapshot)
```

## D) Drop V2 RPCs (only after confirming A+B stable)

```sql
DROP FUNCTION IF EXISTS public.distribute_team_rewards_v2(uuid, integer, integer, uuid, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.get_v5_upmark_factor(integer);
```

After this the codebase is fully reverted. Don't forget to regen types: `npx supabase gen types typescript --project-id ksoohvygoysofvtqdumz > src/types/database.ts` (then trim the leading npm warn line and trailing CLI update notice).

## Migration trail

For audit, the V5 implementation applied these named migrations in order:
1. `v5_upmark_helper`
2. `v5_distribute_team_rewards_v2`
3. `v5_wire_up_peer_review`
4. `v5_backfill_inflate_totals`

Their full SQL is stored in Supabase's `supabase_migrations.schema_migrations` table.
