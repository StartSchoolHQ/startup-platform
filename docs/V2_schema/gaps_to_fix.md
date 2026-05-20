# SQL Migration Author Checklist

Traceability doc — every audit finding traced to the spec change, so the SQL migration author has a single reference. If you implement V2 SQL and a fix from this list isn't reflected in your migration, the deploy is incomplete.

**Read order**: this file → `README.md` → table specs in dependency order → `rls_policies.md` → `rpcs.md` → `invariants.md` → `partitioning.md` → `retention.md` → `archive_audit_log.md`.

---

## ⛔ AUDIT LOOP CLOSED — DO NOT RUN ANOTHER MARKDOWN AUDIT

After three rounds of audit-fix cycles, we hit the diminishing returns point. The blocker count stayed roughly flat (8 → 4 → 5) but cosmetic-drift findings grew (~7 → ~15 → ~25) because each fix round introduces cross-references that the next audit can flag as inconsistent. **This is asymptotic — markdown specs can be polished forever.**

The forcing function from here is the **SQL migration**, not another markdown audit. Writing real SQL is a discrete consistency check: every reference resolves to a real type/table/function or it errors. Doc text that drifts but the SQL author corrects when writing the migration is fine — the SQL is the truth at deploy time, not the markdown.

**If you find a problem while writing SQL**: fix the SQL, optionally update the spec to match. If you find a problem WITHOUT writing SQL: don't audit further; the next iteration won't find new bugs, only new cascade artifacts.

**CI gates** (defined in `rls_policies.md`) catch the things that genuinely matter at deploy time:
- RLS enabled + forced on every public table
- `search_path` set on every SECURITY DEFINER function
- No internal/cron DEFINER granted to authenticated/anon
- No INSERT policy on append-only ledger tables granted to authenticated

If those four gates pass and the SQL migration runs, V2 is in production.

---

## Round-1 audit findings (all closed)

| ID | Finding | Where fixed |
|---|---|---|
| S-1 | `award_transaction` callable by `authenticated` (XP minting) | [rpcs.md](rpcs.md) — Conventions + Grant matrix; CI gate in [rls_policies.md](rls_policies.md) |
| S-2 | No `SET search_path` on DEFINERs | [rpcs.md](rpcs.md) standard signature template; CI gate in [rls_policies.md](rls_policies.md) |
| S-3 | `users.data` cohort SELECT leaks XP | `users_safe` view in [rls_policies.md](rls_policies.md); cache columns now on `user_balances` with their own view |
| S-4 | `source_table` was free text | Three typed enums: `reward_source_table` (transactions), `entity_source_table` (notifications/activity/support/strikes), `task_suggestion_source_table` (suggestions). [transactions.md](transactions.md), [notifications.md](notifications.md), etc. |
| S-5 | Peer reviewer collusion via reject-resubmit cycles | `submission_attempt <= 4` CHECK + `escalate_to_admin_review` at attempt 4. [team_task_progress.md](team_task_progress.md), [team_task_reviews.md](team_task_reviews.md), [rpcs.md](rpcs.md) |
| S-6 | TOCTOU on team_members INSERT | Trigger documented in [team_task_reviews.md](team_task_reviews.md); pre-check in `accept_invitation` ([rpcs.md](rpcs.md)) |
| S-7 | `register_excused_absence` quota race | `pg_advisory_xact_lock(hashtextextended('absence:'||uid, 0))` in [rpcs.md](rpcs.md) |
| S-8 | Cache-update path conflicts with protect trigger | `app.cache_update_in_progress` flag + dedicated path in [rls_policies.md](rls_policies.md) |
| S-9 | `>= 0` CHECKs on cache columns | Dropped — cache lives on `user_balances`, no CHECK |
| S-10 | `notifications` self-update unrestricted | `tr_protect_notifications_columns` in [rls_policies.md](rls_policies.md) |
| S-11 | Cancel→restart double-counts non-recurring stages | DISTINCT-count rule in [team_task_progress.md](team_task_progress.md) |
| S-12 | SERIALIZABLE isolation needed for multi-row mutations | Documented per RPC in [rpcs.md](rpcs.md) (`accept_invitation`, `submit_team_task_review`, `unlock_*_milestone`) |
| S-13 | JSONB size limits | `pg_column_size(...) < N` CHECKs on every user-supplied jsonb |
| S-14 | Admin RPCs vulnerable to mid-RPC role flip | `SELECT primary_role ... FOR UPDATE` pattern in [rpcs.md](rpcs.md) |
| S-15 | `mark_weekly_reports_missed` cron + concurrent submit creates invalid state | `WHERE status='pending' AND submitted_at IS NULL` in [weekly_reports.md](weekly_reports.md) and [rpcs.md](rpcs.md) |

## Round-3 audit findings (closed; all marked DONE)

| ID | Finding | Where fixed |
|---|---|---|
| B-1 | Invite-only signup flow architecturally incomplete (FK chain blocked first-time INSERT) | Two-step orchestration: backend calls Supabase Auth admin API + new `complete_invitation_setup` `[internal]` RPC documented in [rpcs.md](rpcs.md). User goes through magic-link → `/profile-setup` → `update_my_profile` → `accept_invitation`. |
| B-2 | `founder_*` / `admin_*` RPC split applied to grant matrix but per-function specs were missing | Replaced singular `kick_member` / `transfer_team_founder` / `archive_team` definitions in [rpcs.md](rpcs.md) with split per-function specs: `admin_kick_member` (admin-only — founders cannot kick), `founder_transfer_team_founder`, `admin_transfer_team_founder`, `founder_archive_team`, `admin_archive_team` |
| B-3 | `submission_attempt` cap numbering contradiction across files | Aligned everywhere to `<= 4` semantics: CHECK ≤4, attempts 1-3 peer, attempt 4 always admin-reviewed, audit query targets `> 4`. Updated [team_task_progress.md](team_task_progress.md), [invariants.md](invariants.md), [rpcs.md](rpcs.md). |
| B-4 | `archive_audit_log` Edge Function pseudocode used `Deno.run` + `pg_dump` (not supported on Supabase Edge Functions) | Rewrote consumer in [archive_audit_log.md](archive_audit_log.md) as a **Vercel Cron route** (Node.js runtime) using **JSONL streaming via `COPY` + `pg-copy-streams`** — no `pg_dump` binary, no Deno subprocess. JSONL format is compact, grep-able, and restorable with a ~10-line script. |
| B-5 | No path to create admin users (NEW-A blocker) | **Resolved by deliberate constraint**: admins are created **manually in Supabase Studio** by the platform owner (raw SQL INSERT), not via any API. No promotion RPC. `admin_set_user_role` only allows demote (admin → user), errors on promote. Documented in [user.data.md](user.data.md) and [rpcs.md](rpcs.md). |
| N-1 | `tr_apply_transaction_to_balance` ON CONFLICT didn't update cohort_id on demotion | `admin_set_user_role` updates both `users.data.cohort_id` AND `user_balances.cohort_id` atomically when demoting admin → user (via the same denorm trigger as `admin_set_user_cohort`). Documented in [rpcs.md](rpcs.md). |
| N-3 | `audit_user_xp_drift(p_cohort_id)` skipped admin users (NULL cohort) | New companion RPC `audit_admin_xp_drift()` (no cohort param) — runs daily after the cohort loop, scoped to `WHERE cohort_id IS NULL AND primary_role = 'admin'`. Trivial scan, ~10 admin users at most. Added to [rpcs.md](rpcs.md) grant matrix. |
| N-4 | `escalate_to_admin_review` had a hole on attempt-4 via cancel/restart (no rejection trigger) | `assign_team_task_review` now checks `submission_attempt`: when ≥ 4, force `reviewer_role='admin'` regardless of `task_type`. Closes the loophole. Documented in [rpcs.md](rpcs.md). |

### Items deliberately NOT fixed (asymptotic polish, not blockers)

| ID | Finding | Why skipped |
|---|---|---|
| N-2 | `record_user_active` rate limit | The WHERE-clause debounce makes the call a 0.5ms no-op 95% of the time. Server-side rate limit is overkill at 10k users. Client-side debounce in middleware is the right control. |
| N-5, N-6 | CI gate trigger nits, search_path coverage on triggers | Cosmetic. SQL writing surfaces real gaps. The CI gates we have catch deployable mistakes. |
| N-7 | 100k-scale plan (Realtime sharding, auth-out-of-tx) | Documented in README open questions. Not blocking 10k launch. Address when we approach the scale. |
| C-1 through C-17 | 17 cascade-edit consistency drift items | **Skipped intentionally — see "AUDIT LOOP CLOSED" section above.** SQL writing forces resolution of any stale reference that actually matters; cosmetic drift in markdown doesn't break SQL. |

## Round-2 audit findings (all closed)

| ID | Finding | Where fixed |
|---|---|---|
| B-1 | `tr_apply_transaction_to_balance` silent no-op on missing balance row | `INSERT … ON CONFLICT DO UPDATE` + `RAISE EXCEPTION IF NOT FOUND` in [rls_policies.md](rls_policies.md) |
| B-2 | `transactions.cohort_id NOT NULL` contradicts admin-grant-to-admin | Nullable + `CHECK (type = 'admin_adjustment') OR cohort_id IS NOT NULL` in [transactions.md](transactions.md) |
| B-3 | `submission_attempt <= 3` CHECK contradicts escalation flow | Relaxed to `<= 4` in [team_task_progress.md](team_task_progress.md) |
| B-4 | `update_my_profile` no length CHECK on `name`/`avatar_url` | CHECKs added in [user.data.md](user.data.md) |
| N-1 | Source enum coupling across 4 tables | Split into `reward_source_table` / `entity_source_table` / `task_suggestion_source_table` |
| N-2 | `tr_protect_user_balances` admin bypass | Removed `is_admin()` clause in [rls_policies.md](rls_policies.md); admins fix drift via `audit_recompute_user_caches` |
| N-3 | Default partition silent-fill rot | Removed default partition; loud INSERT failure + 3-week cron lead time in [partitioning.md](partitioning.md) |
| N-4 | `team_task_progress.metadata` and `team_task_reviews.metadata` no size cap | `pg_column_size < 32768` and `< 16384` respectively |
| N-5 | Soft FK audit incomplete | Documented as safe-by-design (lifetime retention on transactions) in [transactions.md](transactions.md) |
| N-6 | `admin_set_user_role` from admin → user violates cohort CHECK | Signature `admin_set_user_role(p_user_id, p_new_role, p_cohort_id_if_demoting)` in [rpcs.md](rpcs.md) |
| N-7 | Cohort denorm trigger ungated | Gate on `app.admin_rpc_in_progress` documented |
| N-8 | `pg_advisory_xact_lock(hashtext(...))` collision risk | Switched to `hashtextextended(..., 0)` |

## New requirements applied

| ID | Requirement | Where applied |
|---|---|---|
| NEW-A | Invite-only signup | `accept_invitation` is the only user-creation path; pairs `users.data` + `user_balances` INSERTs atomically. [rpcs.md](rpcs.md), [user.data.md](user.data.md) |
| NEW-B | Cohort-scoped audits | `audit_user_xp_drift(p_cohort_id)`, `audit_orphan_polymorphic_sources(p_cohort_id)` — required parameter. [rpcs.md](rpcs.md), [invariants.md](invariants.md) |
| NEW-C | Cohort-default RLS | Documented in best-practices section of [README.md](README.md); per-table policies use `current_user_cohort_id()` helper |
| NEW-D | Best-practices section | [README.md](README.md) |
| SC-2 | Auto-archive `audit_log` | New [archive_audit_log.md](archive_audit_log.md) — queue table, cron, Edge Function |
| SC-3 | Realtime: notifications + leaderboard only | Per-user filter on `notifications`, per-cohort on `user_balances`. Activity feed not broadcast. [notifications.md](notifications.md), [user_balances.md](user_balances.md), [activity_events.md](activity_events.md) |
| NEW-E | `last_active_at` on users.data | New column + `record_user_active()` debounced RPC. [user.data.md](user.data.md), [rpcs.md](rpcs.md) |

## Consistency cleanup (cascading-edit residue)

| ID | Issue | File |
|---|---|---|
| C-1, C-2, C-3, C-4, C-5, C-6, C-7 | Stale `users.data` cache refs → `user_balances` | individual_task_progress, team_task_progress, team_task_reviews, team_members, teams, README, rls_policies — all updated |
| C-8 | CI gate name mismatch (`notifications_expiry_cleanup` vs `expire_notifications`) | Fixed to `expire_notifications` + extended internal-functions list in [rls_policies.md](rls_policies.md) |
| C-9 | `mark_weekly_report_missed` singular/plural | Fixed to plural in [weekly_reports.md](weekly_reports.md) |
| C-10 | `transfer_team_founder` / `archive_team` / `kick_member` dual-classified | Split into `founder_*` and `admin_*` variants in [rpcs.md](rpcs.md) |
| C-11 | `escalate_to_admin_review` missing from internal grant matrix | Added in [rpcs.md](rpcs.md) and CI gate list |
| C-12 | `tr_create_user_balances` referenced but undefined | Defined in [rls_policies.md](rls_policies.md) |
| C-13 | `audit_orphan_polymorphic_sources` referenced but undefined | Defined in [rpcs.md](rpcs.md) |
| C-14 | Typo `users_balances_safe` → `user_balances_safe` | Fixed in [rls_policies.md](rls_policies.md) |
| C-15 | `team_strikes` polymorphic source as jsonb keys | Promoted to typed `source_table`/`source_id` columns in [team_strikes.md](team_strikes.md) |

---

## Migration order (the actual SQL plan)

Use this order when writing the migration files. Each step depends only on prior steps.

### 1. Extensions and types

```sql
-- enums (alphabetical by stability)
CREATE TYPE journey_context AS ENUM ('individual', 'team');
CREATE TYPE journey_status AS ENUM ('locked', 'current', 'completed');
CREATE TYPE primary_role_type AS ENUM ('user', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'disabled');
CREATE TYPE user_phase AS ENUM ('individual', 'awaiting_team', 'team', 'graduated');
CREATE TYPE team_status AS ENUM ('active', 'archived', 'disabled');
CREATE TYPE team_role AS ENUM ('founder', 'member');
CREATE TYPE team_leave_reason AS ENUM ('voluntary', 'kicked', 'team_archived');
CREATE TYPE cohort_status AS ENUM ('planned', 'active', 'completed', 'archived');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'auto_declined', 'expired', 'cancelled');
CREATE TYPE individual_task_status AS ENUM ('in_progress', 'completed', 'cancelled');
CREATE TYPE team_task_status AS ENUM ('in_progress', 'submitted', 'in_review', 'approved', 'rejected', 'cancelled');
CREATE TYPE team_task_type AS ENUM ('standard', 'confidential');
CREATE TYPE team_task_review_status AS ENUM ('pending', 'completed', 'expired', 'cancelled');
CREATE TYPE team_task_review_decision AS ENUM ('approved', 'rejected');
CREATE TYPE reviewer_role AS ENUM ('peer', 'admin');
CREATE TYPE task_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE weekly_report_status AS ENUM ('pending', 'submitted', 'missed', 'refunded');
CREATE TYPE absence_type AS ENUM ('excused', 'unexcused');
CREATE TYPE transaction_type AS ENUM ('task_completed', 'peer_review_completed', 'weekly_report_submitted', 'weekly_report_missed', 'meeting_attended', 'milestone_unlocked', 'admin_adjustment', 'reversal');
CREATE TYPE reward_source_table AS ENUM ('individual_task_progress', 'team_task_progress', 'team_task_reviews', 'weekly_reports', 'client_meetings', 'individual_milestone_unlocks', 'team_milestone_unlocks');
CREATE TYPE entity_source_table AS ENUM ('individual_task_progress', 'team_task_progress', 'team_task_reviews', 'weekly_reports', 'client_meetings', 'revenue_streams', 'individual_milestone_unlocks', 'team_milestone_unlocks', 'team_strikes', 'team_invitations', 'absences');
CREATE TYPE task_suggestion_source_table AS ENUM ('individual_tasks', 'team_tasks');
CREATE TYPE notification_category AS ENUM ('peer_review', 'task', 'journey', 'weekly_report', 'invitation', 'team', 'system');
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'critical');
-- (notification_type, support_*, strike_*, revenue_*, client_meeting_*, partition_archive_status, etc. — see specs)
```

### 2. Helper predicates (`SET search_path` mandatory)

`is_admin()`, `is_active_team_member(uuid)`, `current_user_cohort_id()` per [rls_policies.md](rls_policies.md).

### 3. Tables — non-partitioned first

`cohorts`, `users.data`, `user_balances`, `teams`, `team_members`, `team_invitations`, individual_*, team_*, `system_config`, `support_tickets`, `support_rate_limits`, `task_edit_suggestions`, `weekly_reports`, `absences`, `client_meetings`, `revenue_streams`, `team_strikes`, `partition_archive_queue`.

### 4. Partitioned tables — declarative RANGE on `created_at`

`transactions`, `activity_events`, `notifications`, `audit_log`. Per-month partition for launch month. NO default partition.

### 5. Views

`users_safe`, `user_balances_safe`. `REVOKE ALL FROM authenticated; GRANT SELECT TO authenticated`.

### 6. Triggers

In dependency order: `tr_create_user_balances`, `tr_apply_transaction_to_balance`, `tr_protect_user_balances`, `tr_protect_users_data_columns`, `tr_protect_notifications_columns`, `tr_protect_weekly_reports_columns`, `tr_protect_team_task_progress_columns`, TOCTOU triggers on `team_members` and `team_task_reviews`.

### 7. RLS policies + FORCE

Every public table: `ENABLE` + `FORCE` + per-operation policies per [rls_policies.md](rls_policies.md).

### 8. SECURITY DEFINER RPCs

Per [rpcs.md](rpcs.md). Each with `SET search_path = public, pg_catalog` and explicit REVOKE + GRANT per the matrix.

### 9. Cron jobs (Supabase pg_cron)

| Job | Schedule |
|---|---|
| `maintain_partitions()` | weekly |
| `drop_old_partitions()` | monthly |
| `expire_notifications()` | daily |
| `precreate_weekly_reports()` | weekly (Monday 00:00) |
| `mark_weekly_reports_missed()` | daily (after due_at + 1h) |
| `send_weekly_report_reminders()` | daily |
| `expire_pending_invitations()` | hourly |
| `expire_pending_team_task_reviews()` | hourly |
| `audit_user_xp_drift()` | daily, looped per active cohort |
| `audit_orphan_polymorphic_sources()` | weekly, looped per active cohort |
| `enqueue_audit_log_archive()` | monthly |

### 10. Seed data

`cohorts` (first cohort), `system_config` (penalty values, formation cost, defaults), `individual_stages` + `individual_milestones`, `team_stages` + `team_milestones`. Optional: a single admin user.

### 11. CI gates (block deploy if any fail)

Per [rls_policies.md](rls_policies.md):
- Every public table: `relrowsecurity = true AND relforcerowsecurity = true`
- Every SECURITY DEFINER function: `proconfig` contains `search_path=`
- No internal/cron DEFINER has `EXECUTE` granted to `authenticated`/`anon`/`PUBLIC`
- No INSERT policy granting `authenticated` on append-only ledger tables (`transactions`, `activity_events`, `audit_log`, `*_milestone_unlocks`)

### 12. Sentry alerts

Every cron job emits to Sentry on failure. Silent retention/audit failures are how invariants drift unnoticed.

---

## What's NOT in this checklist

- Backup policy — Supabase Pro PITR + daily backups
- App-side rewrite (data layer, API routes, middleware) — separate effort
- Edge Function code for `audit_log` archive — see [archive_audit_log.md](archive_audit_log.md) for pseudocode; deploy step is a manual `supabase functions deploy`
- Realtime subscription wiring on the frontend — see [notifications.md](notifications.md) and [user_balances.md](user_balances.md) for the patterns

---

## Sign-off

Once SQL is written and CI gates pass, V2 is production-ready. Greenfield deploy:

1. Provision fresh Supabase project
2. Run migration files in order (1-12 above)
3. Verify CI gates green
4. Seed initial cohort + stages + milestones + system_config
5. Deploy app pointed at the new project
6. First invitation = first user — schema validated end-to-end

V1 stays archived (read-only Supabase project) for historical lookups.
