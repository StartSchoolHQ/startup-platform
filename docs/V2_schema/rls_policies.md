# RLS Policies

Row Level Security policies, per table. RLS is the last-mile defense — even if app code has a bug, the DB refuses unauthorized reads and writes.

The base rule is **deny by default**: every public table has `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`, with explicit policies opening up specific operations to specific roles.

---

## Roles in scope

| Role | Who | Bypasses RLS? |
|---|---|---|
| `anon` | unauthenticated visitors | no — almost no access |
| `authenticated` | logged-in users (including admins) | no — RLS applies, but DEFINER functions can elevate |
| `service_role` | server-side cron, n8n, admin scripts | **YES** — used inside DEFINER functions and trusted server code only |

`authenticated` is matched against `auth.uid()` in policies. Admin status is checked by reading `users.data.primary_role = 'admin'` inside policies.

---

## Helper predicates (defined once, used everywhere)

**Every helper has `SET search_path = public, pg_catalog`** — without it, schema-injection on `search_path` could shadow `auth.uid()` or `users.data` references and escalate.

```sql
-- Is the current auth user an admin?
CREATE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."users.data"
    WHERE id = auth.uid() AND primary_role = 'admin'
  );
$$;

-- Is the current user an active member of the given team?
CREATE FUNCTION public.is_active_team_member(p_team_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = auth.uid() AND left_at IS NULL
  );
$$;

-- Get the current user's cohort id
CREATE FUNCTION public.current_user_cohort_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT cohort_id FROM public."users.data" WHERE id = auth.uid();
$$;

-- Helpers are safe to expose to authenticated (they only check the caller's own state)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_cohort_id() TO authenticated;
```

---

## Per-table policy summary

Legend: ✅ allowed / ❌ denied / ⚙️ via DEFINER RPC only

### Identity & cross-cutting

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users.data` | own row + same-cohort users (limited fields) + admins all | ⚙️ via signup trigger | ⚙️ profile fields (name, avatar) by self; everything else admin-only | ❌ |
| `cohorts` | active+completed visible to all authenticated; admins see all | ⚙️ admin only | ⚙️ admin only | ❌ |
| `transactions` | own rows; team members read team rows for their team; admins all | ⚙️ DEFINER `award_transaction` only | ❌ never | ❌ never |
| `activity_events` | own rows; team-context events for teams the user is in; admins all | ⚙️ DEFINER only | ❌ | ❌ |
| `notifications` | own rows; admins all | ⚙️ DEFINER only | own row, only `read_at` field | ❌ |
| `system_config` | admin only (regular users never read) | ⚙️ admin only | ⚙️ admin only | ❌ |

### Individual journey

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `individual_stages` | all authenticated (templates) | ⚙️ admin only | ⚙️ admin only | ❌ |
| `individual_milestones` | all authenticated | ⚙️ admin only | ⚙️ admin only | ❌ |
| `individual_tasks` | active tasks for all authenticated | ⚙️ admin only | ⚙️ admin only | ❌ |
| `individual_task_progress` | own rows; admins all | ⚙️ DEFINER `start_individual_task` | ⚙️ DEFINER `submit_individual_task` / `cancel_individual_task` | ❌ |
| `individual_journey` | own rows; admins all | ⚙️ DEFINER (signup, stage progression) | ⚙️ DEFINER only | ❌ |
| `individual_milestone_unlocks` | own rows; admins all | ⚙️ DEFINER `unlock_individual_milestone` only | ❌ | ❌ |

### Team journey

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `teams` | active teams visible to all authenticated; archived/disabled visible to members + admins | ⚙️ DEFINER `create_team` | ⚙️ founder updates name/description/logo/website; admins all fields | ❌ |
| `team_members` | active members readable by all authenticated; full history visible to members + admins | ⚙️ DEFINER (`accept_invitation`, `create_team`) | ⚙️ DEFINER (`leave_team`, `kick_member`, `transfer_team_founder`) | ❌ |
| `team_invitations` | invitee + inviter + admins | ⚙️ DEFINER `send_invitation` | ⚙️ DEFINER (accept/decline/cancel/expire) | ❌ |
| `team_stages` | all authenticated | ⚙️ admin only | ⚙️ admin only | ❌ |
| `team_milestones` | all authenticated | ⚙️ admin only | ⚙️ admin only | ❌ |
| `team_tasks` | active tasks for all authenticated | ⚙️ admin only | ⚙️ admin only | ❌ |
| `team_task_progress` | members of the team + admins | ⚙️ DEFINER `start_team_task` | ⚙️ DEFINER (`submit_team_task`, `approve_team_task`, `cancel_team_task`, `resubmit_team_task`) | ❌ |
| `team_journey` | members of the team + admins | ⚙️ DEFINER | ⚙️ DEFINER | ❌ |
| `team_milestone_unlocks` | members of the team + admins | ⚙️ DEFINER `unlock_team_milestone` | ❌ | ❌ |
| `team_task_reviews` | reviewer + members of submitting team + admins | ⚙️ DEFINER `assign_team_task_review` | ⚙️ DEFINER `submit_team_task_review` | ❌ |

### Reporting / accountability

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `weekly_reports` | own rows; team members see each other's team-context rows; admins all | ⚙️ DEFINER `precreate_weekly_reports` | ⚙️ DEFINER (`submit_weekly_report`, `mark_weekly_reports_missed`, `refund_weekly_report`) | ❌ |
| `absences` | own rows; admins all | ⚙️ DEFINER (`register_excused_absence` for users; `record_unexcused_absence` for n8n / service role) | ⚙️ DEFINER `cancel_excused_absence` (own only) | ❌ |
| `client_meetings` | members of the team + admins | ⚙️ DEFINER `submit_client_meeting` | submitter while `pending_review`; admins via DEFINER | ❌ |
| `revenue_streams` | members of the team for own data; **approved** rows visible to all authenticated (team card); admins all | ⚙️ DEFINER `submit_revenue_stream` | submitter while `pending_review`; admins via DEFINER | ❌ |
| `team_strikes` | members of the team + admins | ⚙️ DEFINER `issue_strike` (admin) | ⚙️ DEFINER `revoke_strike` (admin) | ❌ |
| `task_edit_suggestions` | submitter + admins | authenticated INSERT (rate-limited via DEFINER) | ⚙️ DEFINER `review_task_edit_suggestion` (admin) | ❌ |
| `support_tickets` | submitter + admins | ⚙️ DEFINER `submit_ticket` | ⚙️ DEFINER admin ticket RPCs | ❌ |
| `audit_log` | admin only | system trigger | ❌ | ❌ |
| `support_rate_limits` | own row | ⚙️ DEFINER `submit_ticket` | ⚙️ DEFINER `submit_ticket` | ❌ |

---

## Sample policy SQL

Examples to anchor the patterns. Real migration writes one for every table.

### `users.data` — read goes through `users_safe` view

**`users.data` SELECT is denied to all authenticated.** Reads route through the `public.users_safe` view, which whitelists columns that are safe to expose to peers. The view contains a security barrier so the planner doesn't push predicates into `users.data` and leak rows.

```sql
ALTER TABLE public."users.data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users.data" FORCE ROW LEVEL SECURITY;

-- Direct SELECT only for the row owner (so DEFINER chains and same-row UI flows still work)
CREATE POLICY users_data_select_self ON public."users.data"
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admins read everything directly (DEFINER admin tooling)
CREATE POLICY users_data_select_admin ON public."users.data"
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- NO peer-read policy on the base table — peers read via users_safe view below.

-- writes: NO RLS policy granting any UPDATE/INSERT/DELETE.
-- All client writes go through the SECURITY DEFINER `update_my_profile(p_name, p_avatar_url)` RPC.
-- All admin writes go through `admin_set_user_*` RPCs.
-- Column-level safety is enforced by `tr_protect_users_data_columns` (see below).
```

#### `users_safe` view — public-facing whitelist

```sql
CREATE VIEW public.users_safe
WITH (security_barrier = true) AS
SELECT
  u.id,
  u.name,
  u.avatar_url,
  u.primary_role,
  u.phase,
  u.cohort_id,
  u.created_at
FROM public."users.data" u
WHERE
  u.id = auth.uid()                                              -- own row
  OR u.cohort_id IS NOT NULL                                     -- discoverability
     AND u.cohort_id = public.current_user_cohort_id()           -- only same cohort
  OR public.is_admin();

REVOKE ALL ON TABLE public."users.data" FROM authenticated, anon;
GRANT  SELECT ON public.users_safe TO authenticated;
```

The view exposes only: `id`, `name`, `avatar_url`, `primary_role`, `phase`, `cohort_id`, `created_at`. NOT exposed: `status`, `absence_quota`, `invited_by`, `updated_at`. Cache columns aren't on `users.data` at all (they live in [user_balances](user_balances.md), which has its own view).

#### `user_balances_safe` view — leaderboard read

```sql
CREATE VIEW public.user_balances_safe
WITH (security_barrier = true) AS
SELECT
  b.user_id,
  b.individual_exp,
  b.team_exp,
  b.individual_points,
  b.team_points,
  b.cohort_id
FROM public.user_balances b
WHERE
  b.user_id = auth.uid()
  OR b.cohort_id IS NOT NULL
     AND b.cohort_id = public.current_user_cohort_id()
  OR public.is_admin();

REVOKE ALL ON TABLE public.user_balances FROM authenticated, anon;
GRANT  SELECT ON public.user_balances_safe TO authenticated;
```

Leaderboards JOIN `user_balances_safe` to `users_safe` on `user_id`. Indexes on `user_balances(cohort_id, *_exp DESC)` are preserved through the view because `security_barrier` doesn't block index usage on safe predicates.

#### Column-level write protection trigger

```sql
CREATE FUNCTION public.tr_protect_users_data_columns() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Bypass for service role and DEFINER admin chain
  IF current_setting('role', true) = 'service_role'
     OR current_setting('app.admin_rpc_in_progress', true) = 'on'
  THEN RETURN NEW; END IF;

  -- Block anything except name, avatar_url, updated_at by non-admins
  IF NEW.primary_role  IS DISTINCT FROM OLD.primary_role
     OR NEW.cohort_id  IS DISTINCT FROM OLD.cohort_id
     OR NEW.phase      IS DISTINCT FROM OLD.phase
     OR NEW.status     IS DISTINCT FROM OLD.status
     OR NEW.absence_quota IS DISTINCT FROM OLD.absence_quota
     OR NEW.invited_by IS DISTINCT FROM OLD.invited_by
     OR NEW.id         IS DISTINCT FROM OLD.id
  THEN
    RAISE EXCEPTION 'forbidden column update on users.data';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_users_data_columns
  BEFORE UPDATE ON public."users.data"
  FOR EACH ROW EXECUTE FUNCTION public.tr_protect_users_data_columns();
```

Admin RPCs that legitimately update protected columns set `SET LOCAL app.admin_rpc_in_progress = 'on'` at the start of their transaction.

### `transactions`

```sql
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY transactions_select_own ON public.transactions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (team_id IS NOT NULL AND public.is_active_team_member(team_id))
    OR public.is_admin()
  );

-- NO INSERT / UPDATE / DELETE policies — only DEFINER functions (running as service_role
-- internally, or with SECURITY DEFINER bypassing RLS) can write.
```

### `team_task_progress`

```sql
ALTER TABLE public.team_task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_task_progress FORCE ROW LEVEL SECURITY;

CREATE POLICY team_task_progress_select ON public.team_task_progress
  FOR SELECT TO authenticated
  USING (
    public.is_active_team_member(team_id)
    OR public.is_admin()
  );

-- writes: DEFINER only
```

### `notifications`

```sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- user can only mark their own as read (column-level enforced by trigger)
CREATE POLICY notifications_update_read ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- admin: full update
CREATE POLICY notifications_update_admin ON public.notifications
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

#### `tr_protect_notifications_columns` trigger

```sql
CREATE FUNCTION public.tr_protect_notifications_columns() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR public.is_admin()
  THEN RETURN NEW; END IF;

  -- Non-admin users can ONLY change read_at. Anything else raises.
  IF NEW.user_id        IS DISTINCT FROM OLD.user_id
     OR NEW.actor_user_id  IS DISTINCT FROM OLD.actor_user_id
     OR NEW.category    IS DISTINCT FROM OLD.category
     OR NEW.type        IS DISTINCT FROM OLD.type
     OR NEW.priority    IS DISTINCT FROM OLD.priority
     OR NEW.title       IS DISTINCT FROM OLD.title
     OR NEW.message     IS DISTINCT FROM OLD.message
     OR NEW.source_table IS DISTINCT FROM OLD.source_table
     OR NEW.source_id   IS DISTINCT FROM OLD.source_id
     OR NEW.action_url  IS DISTINCT FROM OLD.action_url
     OR NEW.metadata    IS DISTINCT FROM OLD.metadata
     OR NEW.expires_at  IS DISTINCT FROM OLD.expires_at
     OR NEW.created_at  IS DISTINCT FROM OLD.created_at
     OR NEW.cohort_id   IS DISTINCT FROM OLD.cohort_id
  THEN
    RAISE EXCEPTION 'forbidden notification column update — only read_at is editable by user';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_notifications_columns
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.tr_protect_notifications_columns();
```

---

## Cache-update path: `user_balances` is trigger-driven, not RPC-driven

The XP/points cache lives in [user_balances](user_balances.md), separate from `users.data`. The cache write path is:

1. `award_transaction` DEFINER inserts a row into `transactions`.
2. AFTER INSERT trigger on `transactions` fires `tr_apply_transaction_to_balance`.
3. The trigger sets a session-local flag `SET LOCAL app.cache_update_in_progress = 'on'`.
4. The trigger UPDATEs `user_balances` for the user's row; the protect-columns trigger on `user_balances` checks the flag and permits the write.
5. When the outer transaction commits (or rolls back), the flag is gone.

```sql
-- The cache-update trigger on transactions — UPSERT, not UPDATE.
-- The upsert defends against any signup race where transactions might fire before
-- the user_balances row exists. Without ON CONFLICT this would silently no-op.
CREATE FUNCTION public.tr_apply_transaction_to_balance() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM set_config('app.cache_update_in_progress', 'on', true);  -- LOCAL = txn scoped
  IF NEW.context = 'individual' THEN
    INSERT INTO public.user_balances (user_id, cohort_id, individual_exp, individual_points)
    VALUES (NEW.user_id, NEW.cohort_id, NEW.xp_change, NEW.points_change)
    ON CONFLICT (user_id) DO UPDATE
      SET individual_exp    = user_balances.individual_exp    + EXCLUDED.individual_exp,
          individual_points = user_balances.individual_points + EXCLUDED.individual_points,
          updated_at        = now();
  ELSE
    INSERT INTO public.user_balances (user_id, cohort_id, team_exp, team_points)
    VALUES (NEW.user_id, NEW.cohort_id, NEW.xp_change, NEW.points_change)
    ON CONFLICT (user_id) DO UPDATE
      SET team_exp    = user_balances.team_exp    + EXCLUDED.team_exp,
          team_points = user_balances.team_points + EXCLUDED.team_points,
          updated_at  = now();
  END IF;
  -- Defense in depth: if neither path matched a row (impossible in practice), surface it.
  IF NOT FOUND THEN
    RAISE EXCEPTION 'cache update produced no row — investigate user_balances integrity';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_transaction_to_balance
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.tr_apply_transaction_to_balance();

-- The protect-columns trigger on user_balances.
-- CRITICAL: admins do NOT bypass this. Cache corrections go through admin_grant
-- (which writes a transaction → trigger fires → cache updates) or
-- audit_recompute_user_caches (which uses service_role inside a DEFINER).
CREATE FUNCTION public.tr_protect_user_balances() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_setting('app.cache_update_in_progress', true) = 'on'
     OR current_setting('role', true) = 'service_role'
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'user_balances may only be updated via the transactions trigger chain or admin recovery RPC';
END;
$$;

CREATE TRIGGER protect_user_balances
  BEFORE UPDATE ON public.user_balances
  FOR EACH ROW EXECUTE FUNCTION public.tr_protect_user_balances();

-- The signup-pair trigger: every users.data INSERT creates a paired user_balances row.
-- Called by accept_invitation (the only signup path). Idempotent via ON CONFLICT
-- in case accept_invitation retries.
CREATE FUNCTION public.tr_create_user_balances() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.user_balances (user_id, cohort_id)
  VALUES (NEW.id, NEW.cohort_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_user_balances
  AFTER INSERT ON public."users.data"
  FOR EACH ROW EXECUTE FUNCTION public.tr_create_user_balances();
```

This pattern resolves the documented invariant ("cache only mutated by award function") with the actual write path (trigger fires inside the DEFINER's transaction). The flag is safe because it's `LOCAL` to the transaction — concurrent transactions can't see each other's setting.

## Column-level write protection (trigger pattern)

Postgres RLS UPDATE policies can't restrict *which columns* a user updates. For sensitive cache columns, we use a `BEFORE UPDATE` trigger that compares `OLD` vs `NEW` and raises an exception if a non-admin touches a forbidden column.

Tables that need column-level protection:

| Table | Forbidden for non-admins |
|---|---|
| `users.data` | `primary_role`, `cohort_id`, `phase`, `status`, `absence_quota`, `invited_by`, `id` |
| `user_balances` | every column except `updated_at` (and only via the cache-update trigger chain — see below) |
| `notifications` | everything except `read_at` |
| `team_task_progress` | everything (DEFINER-only) |
| `weekly_reports` | everything (DEFINER-only) |
| (every other write-restricted table follows this pattern) |

Generic trigger function:

```sql
CREATE FUNCTION public.tr_protect_columns() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- if running as service_role or via SECURITY DEFINER, allow
  IF current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- protected columns per table — branch by TG_TABLE_NAME or use per-table triggers
  IF TG_TABLE_NAME = 'users.data' THEN
    IF NEW.individual_exp IS DISTINCT FROM OLD.individual_exp
       OR NEW.team_exp IS DISTINCT FROM OLD.team_exp
       OR NEW.individual_points IS DISTINCT FROM OLD.individual_points
       OR NEW.team_points IS DISTINCT FROM OLD.team_points
       OR NEW.primary_role IS DISTINCT FROM OLD.primary_role
       OR NEW.cohort_id IS DISTINCT FROM OLD.cohort_id
       OR NEW.phase IS DISTINCT FROM OLD.phase
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.absence_quota IS DISTINCT FROM OLD.absence_quota
    THEN
      RAISE EXCEPTION 'forbidden column update on users.data';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
```

In practice, write one trigger function per table for clarity rather than the generic branching version above.

---

## Anti-patterns to avoid

| ❌ Don't | Why |
|---|---|
| Write to `transactions` from API routes via the regular client | Bypasses the cache-update trigger chain. Always use `award_transaction`. |
| Use the service role client in the browser | The key would leak. Service role is for server-side cron + admin scripts only. |
| Trust client-supplied user ids in DEFINER functions | Always derive from `auth.uid()`. |
| Create a "read all" admin policy without checking `is_admin()` from a stable function | Must be a SECURITY DEFINER helper, otherwise infinite RLS recursion. |
| Skip `FORCE ROW LEVEL SECURITY` | Without FORCE, the table owner bypasses RLS, including service role doing things it shouldn't. Always FORCE. |
| Disable RLS "temporarily" for a migration | Run the migration through DEFINER functions or with explicit `BYPASSRLS` role grant — never disable. |

---

## Pre-deploy assertions (mandatory)

Before any deploy, these queries must return zero rows:

```sql
-- Every public table must have RLS enabled + forced
SELECT schemaname, tablename
FROM pg_tables t
WHERE schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.oid = (schemaname || '.' || tablename)::regclass
      AND c.relrowsecurity = true
      AND c.relforcerowsecurity = true
  );
```

```sql
-- No table should have an INSERT policy that allows direct authenticated writes
-- to ledger / state tables (transactions, activity_events, *_task_progress, etc.)
SELECT polname, schemaname, tablename
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('transactions', 'activity_events', 'individual_task_progress',
                     'team_task_progress', 'individual_milestone_unlocks',
                     'team_milestone_unlocks', 'team_task_reviews',
                     'weekly_reports')
  AND cmd = 'INSERT'
  AND 'authenticated' = ANY(roles);
```

These are CI gates. Fail the build if either returns rows.

### CI gate: every DEFINER function has `search_path` set

```sql
-- Every SECURITY DEFINER function must SET search_path
SELECT n.nspname || '.' || p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND NOT EXISTS (
    SELECT 1 FROM unnest(p.proconfig) AS cfg
    WHERE cfg LIKE 'search_path=%'
  );
```

### CI gate: internal/cron DEFINER functions are NOT callable by `authenticated`

```sql
-- Build-time list of internal-only function names (kept in sync with rpcs.md grant matrix).
-- Any of these granting EXECUTE to authenticated/anon/PUBLIC fails the build.
WITH internal_functions(fname) AS (VALUES
  ('award_transaction'), ('evaluate_individual_stage_progression'),
  ('unlock_individual_milestone'), ('assign_team_task_review'),
  ('approve_team_task'), ('evaluate_team_stage_progression'),
  ('unlock_team_milestone'), ('escalate_to_admin_review'),
  ('precreate_weekly_reports'), ('mark_weekly_reports_missed'),
  ('send_weekly_report_reminders'), ('expire_pending_invitations'),
  ('record_unexcused_absence'), ('audit_user_xp_drift'),
  ('audit_orphan_polymorphic_sources'), ('expire_notifications'),
  ('drop_old_partitions'), ('maintain_partitions'),
  ('archive_audit_log_partition'), ('escalate_to_admin_review'),
  ('tr_apply_transaction_to_balance'), ('tr_create_user_balances'),
  ('tr_protect_user_balances'), ('tr_protect_users_data_columns'),
  ('tr_protect_notifications_columns'), ('tr_protect_weekly_reports_columns')
)
SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS func,
       acl.grantee
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN internal_functions f ON f.fname = p.proname
CROSS JOIN LATERAL aclexplode(p.proacl) AS acl
WHERE n.nspname = 'public'
  AND acl.privilege_type = 'EXECUTE'
  AND acl.grantee::regrole::text IN ('authenticated', 'anon', 'PUBLIC');
```

Fails the build if any internal function is callable by `authenticated`.
