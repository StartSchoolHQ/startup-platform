# SECURITY DEFINER RPC Catalog

Every privileged write in V2 happens through a `SECURITY DEFINER` function. The app NEVER writes directly to `transactions`, `notifications`, `activity_events`, or any state-bearing table — it calls one of these RPCs. RLS denies direct writes; only these functions hold the keys.

This is the contract: if it's not in this catalog and it requires bypassing RLS, it doesn't ship.

---

## Conventions every RPC follows

| Rule | Detail |
|---|---|
| **`SET search_path = public, pg_catalog`** | **Every** DEFINER function MUST declare this in its signature. Without it, schema-injection on the search_path can hijack the function. CI gate enforces it. |
| **Explicit `REVOKE` + `GRANT`** | Every internal/cron-only DEFINER MUST `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` and `GRANT EXECUTE TO service_role` (and to function-owner for chaining). Functions exposed to clients explicitly `GRANT EXECUTE TO authenticated`. **No DEFINER ships without an explicit grant matrix.** |
| Auth check first | Every RPC starts with `auth.uid()` resolution and authorization check. Never trust client-provided user ids. Admin checks use `SELECT primary_role FROM "users.data" WHERE id = auth.uid() FOR UPDATE` to guard against mid-RPC role changes. |
| Single transaction | All side effects happen atomically. Errors abort the whole operation. |
| **Isolation** | RPCs that read-then-write across multiple rows (multi-row mutations, quota checks, fan-outs) MUST `SET LOCAL transaction_isolation = 'serializable'` OR use `pg_advisory_xact_lock(hashtext(<scope>::text))` for per-scope serialization. Listed per RPC below. |
| Validate polymorphic source | When writing `source_table` + `source_id`, dispatch via `CASE source_table` (no `EXECUTE format` — that's a SQL injection vector). The `source_table` column is a **dedicated enum**, not text. |
| Return value | RPCs return the primary affected row id (uuid) or a structured result. Never void unless side-effect-only. |
| Errors | Raise `EXCEPTION` with descriptive message. Caller maps to user-facing toast. |
| Fan-out side effects | Notifications, activity events, transactions are inserted by the same function — never relied on app code to do it. |
| Idempotency where possible | Cron RPCs use UNIQUE constraints + `ON CONFLICT DO NOTHING` to be safely retryable. |

### Grant matrix — the contract

Every DEFINER function in this catalog is tagged `[client]`, `[internal]`, or `[cron]`:

| Tag | Grants |
|---|---|
| `[client]` | `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated` |
| `[internal]` | `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role` (chained-only — called by other DEFINER, never by clients) |
| `[cron]` | same as `[internal]` — only `service_role` invokes |
| `[admin]` | `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated`, but the function asserts `is_admin()` first |

**CI gate**: a query at deploy time asserts that no `[internal]` or `[cron]` function has `EXECUTE` granted to `authenticated` or `anon`. See [rls_policies.md](rls_policies.md).

### Grant matrix — every function in this catalog

| Tag | Functions |
|---|---|
| `[internal]` (NEVER callable by clients; called by other DEFINER chains OR by server-side backends with service-role key) | `award_transaction`, `evaluate_individual_stage_progression`, `unlock_individual_milestone`, `assign_team_task_review`, `approve_team_task`, `evaluate_team_stage_progression`, `unlock_team_milestone`, `escalate_to_admin_review`, `archive_audit_log_partition`, `complete_invitation_setup` |
| `[cron]` (service_role only) | `precreate_weekly_reports`, `mark_weekly_reports_missed`, `send_weekly_report_reminders`, `expire_pending_invitations`, `expire_pending_team_task_reviews`, `record_unexcused_absence`, `audit_user_xp_drift`, `audit_admin_xp_drift`, `audit_orphan_polymorphic_sources`, `expire_notifications`, `maintain_partitions`, `drop_old_partitions`, `enqueue_audit_log_archive` |
| `[admin]` (auth check + locked role assertion first) | `refund_weekly_report`, `review_client_meeting`, `review_revenue_stream`, `review_task_edit_suggestion`, `issue_strike`, `revoke_strike`, `admin_grant`, `admin_set_user_phase`, `admin_set_user_cohort`, `admin_set_user_status`, `admin_set_user_role`, `admin_update_system_config`, `admin_create_cohort`, `admin_update_cohort`, `admin_archive_cohort`, `audit_recompute_user_caches`, `assign_ticket`, `update_ticket_status`, `resolve_ticket`, `admin_kick_member`, `admin_transfer_team_founder`, `admin_archive_team` |
| `[client]` (any authenticated user; per-RPC auth + ownership checks) | `accept_invitation`, `decline_invitation`, `cancel_invitation`, `send_invitation`, `start_individual_task`, `submit_individual_task`, `cancel_individual_task`, `start_team_task`, `submit_team_task`, `submit_team_task_review`, `resubmit_team_task`, `cancel_team_task`, `create_team`, `leave_team`, `founder_transfer_team_founder`, `founder_archive_team`, `submit_weekly_report`, `register_excused_absence`, `cancel_excused_absence`, `submit_client_meeting`, `submit_revenue_stream`, `submit_ticket`, `submit_task_edit_suggestion`, `update_my_profile`, `record_user_active` |

**Note on dual-classification functions**: `transfer_team_founder` and `kick_member` and `archive_team` previously appeared with both `[client]` and `[admin]` tags. We split them into two functions each — `founder_*` for the team-founder flow and `admin_*` for admin override — so each function has a single tag and a single grant matrix entry. Implementation may share code internally via a `[internal]` helper.

### Standard signature template

```sql
CREATE OR REPLACE FUNCTION public.<name>(<args>)
  RETURNS <type>
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  -- 1. Auth check (raise on failure)
  -- 2. Optional: SET LOCAL transaction_isolation = 'serializable'
  --    OR PERFORM pg_advisory_xact_lock(...)
  -- 3. Validate polymorphic source via CASE
  -- 4. Side effects (single transaction)
  RETURN <id>;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.<name>(<args>) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.<name>(<args>) TO <role>;  -- per tag
```

---

## Core ledger

### `award_transaction(p_user_id, p_team_id, p_type, p_context, p_xp_change, p_points_change, p_source_table, p_source_id, p_description, p_metadata)` `[internal]`

The single point through which any `transactions` row gets written. ALL reward / penalty / reversal flows call this. **NOT callable by `authenticated`** — REVOKE + GRANT to `service_role` only.

| Aspect | Detail |
|---|---|
| Tag | `[internal]` — only invoked by other DEFINER (e.g. `submit_individual_task`, `approve_team_task`, `admin_grant`). Direct client calls explicitly forbidden by grant matrix. |
| Auth | No `auth.uid()` check (caller has already authed). Validates the polymorphic source dispatch. |
| Validates | `(source_table, source_id)` row exists via `CASE source_table` dispatch (no `EXECUTE format`). `team_id IS NOT NULL` when `context='team'`; deltas not both zero. `p_source_table` is `transaction_source_table` enum — invalid values fail at SQL parse. |
| Writes | 1 `transactions` row; updates `user_balances.{context}_exp / {context}_points` (NOT `users.data` — see [user_balances.md](user_balances.md)); inserts 1 `activity_events` row. The cache update inside the AFTER-INSERT trigger sets `SET LOCAL app.cache_update_in_progress = 'on'` so `tr_protect_columns` permits the write. |
| Returns | `transactions.id` |
| Errors | `team_id_required_for_team_context`, `invalid_source`, `zero_delta` |

---

## Individual journey

### `submit_individual_task(p_task_id, p_submission_data, p_submission_url, p_submission_notes)`

| Aspect | Detail |
|---|---|
| Auth | `auth.uid()` is the user; user must be in `phase = 'individual'`; task must belong to their current `individual_journey` stage |
| Writes | INSERT or UPDATE `individual_task_progress` to `status='completed'`, `completed_at=now()`, snapshots `xp_awarded` / `points_awarded`; calls `award_transaction` (`type='task_completed'`, `context='individual'`); updates `individual_journey.tasks_completed_count`; calls `evaluate_individual_stage_progression` |
| Returns | `individual_task_progress.id` |
| Errors | `not_in_individual_phase`, `task_not_in_current_stage`, `task_already_completed` |

### `start_individual_task(p_task_id)`

| Aspect | Detail |
|---|---|
| Auth | same as submit |
| Writes | INSERT `individual_task_progress` with `status='in_progress'`, `started_at=now()` |
| Idempotency | UNIQUE `(user_id, task_id)` — re-call returns existing row |
| Returns | `individual_task_progress.id` |

### `cancel_individual_task(p_task_progress_id)`

| Aspect | Detail |
|---|---|
| Auth | row's `user_id = auth.uid()`; status must be `in_progress` |
| Writes | `status='cancelled'`, `cancelled_at=now()` |
| Returns | row id |

### `evaluate_individual_stage_progression(p_user_id, p_stage_id)` *(internal)*

Recomputes `progress_percent`, advances stage if threshold crossed, unlocks milestones via `unlock_individual_milestone`. Called by `submit_individual_task`. Not exposed to clients.

### `unlock_individual_milestone(p_user_id, p_milestone_id)` `[internal]`

| Aspect | Detail |
|---|---|
| Isolation | `SET LOCAL transaction_isolation = 'serializable'` — concurrent task completions could race the UNIQUE check. |
| Writes | INSERT `individual_milestone_unlocks` ON CONFLICT DO NOTHING; if inserted, calls `award_transaction` (`type='milestone_unlocked'`, `context='individual'`) and links `transaction_id` |
| Idempotency | UNIQUE `(user_id, milestone_id)` ensures single payout |

---

## Team journey

### `start_team_task(p_team_id, p_task_id)`

| Aspect | Detail |
|---|---|
| Auth | caller is active `team_members` of `p_team_id`; user is in `phase='team'`; task belongs to team's current `team_journey` stage; for recurring tasks, no active row exists AND `next_available_at` (if any) has passed |
| Writes | INSERT `team_task_progress` with `status='in_progress'`, `picked_up_by_user_id=auth.uid()` |
| Idempotency | partial UNIQUE on active states |
| Returns | `team_task_progress.id` |

### `submit_team_task(p_team_task_progress_id, p_submission_data, p_submission_url, p_submission_notes)`

| Aspect | Detail |
|---|---|
| Auth | caller is active `team_members` of the row's team |
| Writes | UPDATE `team_task_progress` to `status='submitted'`, `submitted_at=now()`, `submitted_by_user_id=auth.uid()`; calls `assign_team_task_review` |
| Returns | row id |

### `assign_team_task_review(p_team_task_progress_id)` `[internal]`

| Aspect | Detail |
|---|---|
| Logic | Reads `team_tasks.task_type` AND `team_task_progress.submission_attempt`. **If `submission_attempt >= 4`**: force `reviewer_role='admin'` regardless of `task_type` — closes the cancel-then-restart loophole where a team could reach attempt 4 without going through rejection/escalation. Otherwise: for `standard` task_type pick eligible peer reviewer (`SELECT … FROM "users.data" u WHERE u.phase='team' AND u.status='active' AND NOT EXISTS (active membership in submitting team) ORDER BY (pending_review_count, RANDOM()) FOR UPDATE SKIP LOCKED LIMIT 1` — `SKIP LOCKED` mandatory to prevent serialization at high concurrency); for `confidential` pick admin (same pattern with `primary_role='admin'`). For resubmissions on attempts 2-3, prefer the SAME reviewer as the prior round; fallback if unavailable. |
| Writes | INSERT `team_task_reviews` row, status `pending`, `due_at = now() + team_tasks.peer_review_due_hours`; UPDATE `team_task_progress` to `status='in_review'`, `review_started_at=now()`; INSERT `notifications` (`peer_review_assigned`) for the reviewer |
| Returns | `team_task_reviews.id` |

### `submit_team_task_review(p_review_id, p_decision, p_feedback, p_criteria_scores)` `[client]`

| Aspect | Detail |
|---|---|
| Isolation | `SET LOCAL transaction_isolation = 'serializable'` — milestone unlock cascade plus team-task approval fan-out require strict serialization. |
| Auth | row's `reviewer_user_id = auth.uid()` and `status='pending'` and `due_at > now()`. **Submission_attempt cap:** the 4th attempt is always admin-assigned (forced by `assign_team_task_review`). If a peer reviewer somehow has a 4th-attempt row (edge case from a manual reassignment), they cannot reject it past attempt 4 — the RPC errors `submission_attempt_cap_exceeded`. Normal flow: peer rejection at attempt 3 triggers `escalate_to_admin_review` which produces the attempt-4 admin row. |
| Writes | UPDATE row to `status='completed'`, `decision`, `feedback`, `criteria_scores`, `completed_at=now()`. **If `reviewer_role='peer'`:** snapshot `xp_awarded` / `points_awarded` from `team_tasks`, call `award_transaction` (`type='peer_review_completed'`, `context='team'`), set `transaction_id`. **If `reviewer_role='admin'`:** no transaction. **If `decision='approved'`:** call `approve_team_task` (cascades fan-out). **If `decision='rejected'`:** UPDATE `team_task_progress` to `status='rejected'`. |
| Returns | review id |
| Errors | `not_assigned_reviewer`, `review_expired`, `already_completed`, `submission_attempt_cap_exceeded` |

### `approve_team_task(p_team_task_progress_id)` *(internal)*

| Aspect | Detail |
|---|---|
| Writes | UPDATE `team_task_progress` to `status='approved'`, `completed_at=now()`, snapshot `xp_awarded_per_member` / `points_awarded_per_member` from `team_tasks`. For each active `team_members` row, call `award_transaction` (`type='task_completed'`, `context='team'`, `team_id` set, source = the progress row). For recurring tasks, also set `next_available_at = completed_at + cooldown_days * interval '1 day'`. UPDATE `team_journey.tasks_completed_count` (if first time approving this task — distinct count). Call `evaluate_team_stage_progression`. |

### `resubmit_team_task(p_team_task_progress_id, p_submission_data, ...)`

| Aspect | Detail |
|---|---|
| Auth | active member of team; row is `rejected` |
| Writes | UPDATE `team_task_progress`: `status='in_progress'`, `submission_attempt = submission_attempt + 1`, clear submission fields. Caller then calls `submit_team_task` again to resubmit; `assign_team_task_review` reuses prior reviewer if available. |

### `cancel_team_task(p_team_task_progress_id)`

| Aspect | Detail |
|---|---|
| Auth | active member of team; row in `in_progress` (not yet submitted) |
| Writes | `status='cancelled'`, `cancelled_at=now()`. If a `team_task_reviews` row exists in `pending`, mark it `cancelled`. |

### `evaluate_team_stage_progression(p_team_id, p_stage_id)` *(internal)*

Mirrors individual version but for teams. Advances `team_journey` stage and unlocks `team_milestones` via `unlock_team_milestone`.

### `unlock_team_milestone(p_team_id, p_milestone_id)` `[internal]`

| Aspect | Detail |
|---|---|
| Isolation | `SET LOCAL transaction_isolation = 'serializable'` — fan-out to N members + UNIQUE check cannot race. |
| Writes | INSERT `team_milestone_unlocks` ON CONFLICT DO NOTHING; if inserted, snapshot `members_paid_count`, fan out `award_transaction` per active member (`type='milestone_unlocked'`, `context='team'`, source = the unlock row) ordered by `member_id` ASC for deterministic lock acquisition. |

---

## Teams & membership

### `create_team(p_name, p_description, p_logo_url, p_website)`

| Aspect | Detail |
|---|---|
| Auth | `auth.uid()` is in `phase='awaiting_team'` (or admin override); has enough `individual_points` for `formation_cost` from `system_config`; not currently active in any team |
| Writes | Generate unique slug from name; INSERT `teams` (snapshotting `formation_cost`, `cohort_id` from founder's cohort); INSERT `team_members` row for founder (`team_role='founder'`); call `award_transaction` for the formation cost (negative `points_change`, `type='admin_adjustment'` or new `team_formation` type); transition founder's `phase='team'`; INSERT `team_journey` rows for the cohort's team stages; INSERT activity_events (`team_created`, `team_member_joined`) |
| Errors | `insufficient_points`, `already_in_team`, `wrong_phase` |

### `send_invitation(p_team_id, p_invited_user_id, p_proposed_role, p_message)`

| Aspect | Detail |
|---|---|
| Auth | caller is `founder` of the team OR admin |
| Validates | invitee's `cohort_id` matches `teams.cohort_id`; invitee not active in any team; no `pending` invite for `(team_id, invited_user_id)` already |
| Writes | INSERT `team_invitations` row, `expires_at = now() + 7 days`; INSERT `notifications` (`invitation_received`) |
| Returns | invitation id |

## Signup flow — the canonical orchestration

Signup is **invite-only** and split into two server-side steps, neither of which is "create user from inside the database":

```
ADMIN CLICKS INVITE
   ↓ Backend API route (Vercel server function or Supabase Edge Function)
   ↓ 1. Calls Supabase Auth admin API:
        supabase.auth.admin.inviteUserByEmail(email)
        → creates auth.users row, sends magic-link email, returns the new user_id
   ↓ 2. Calls SECURITY DEFINER RPC:
        complete_invitation_setup(p_user_id, p_cohort_id, p_team_id, p_proposed_role, p_invited_by_user_id)
        → creates users.data skeleton row (firing tr_create_user_balances)
        → creates team_invitations row
        → returns invitation_id
INVITEE RECEIVES EMAIL
   ↓ Clicks magic link → Supabase Auth signs them in
   ↓ App routes to /profile-setup page (frontend)
   ↓ User fills name + avatar
   ↓ Frontend calls update_my_profile(name, avatar_url)
   ↓ Frontend calls accept_invitation(invitation_id)
DONE — user is in their team, phase='team', balances initialized
```

The auth user is created BY the Supabase Auth admin API (not by Postgres). The DB-side `complete_invitation_setup` RPC trusts the `p_user_id` parameter because the backend calling it has the service-role key — **only server code with the service-role key can invoke it.**

### `complete_invitation_setup(p_user_id, p_cohort_id, p_team_id, p_proposed_role, p_invited_by_user_id)` `[internal]`

| Aspect | Detail |
|---|---|
| Tag | `[internal]` — REVOKE from authenticated/anon; GRANT to service_role only. Called from a server-side backend that holds the service role key. |
| Validates | `auth.users` row for `p_user_id` exists; cohort exists; team exists and `team.cohort_id = p_cohort_id`; inviter is founder of team OR admin |
| Writes | INSERT `users.data` (id=`p_user_id`, name='', cohort_id, status='active', primary_role='user', phase='individual'). Trigger `tr_create_user_balances` fires → INSERT `user_balances` (zero balances, cohort_id matched). INSERT `team_invitations` (status='pending', expires_at=now()+7d). Fire `invitation_received` notification once auth.users.email is the invitee's email. |
| Returns | `team_invitations.id` |
| Idempotency | If `users.data` row already exists for `p_user_id` (re-invite of an existing user), skip the INSERT and just create the `team_invitations` row. ON CONFLICT on `tr_create_user_balances` makes the trigger safe. |

### `accept_invitation(p_invitation_id)` `[client]`

The user has signed in via magic link, completed profile setup, and is ready to join. By this point `users.data` and `user_balances` already exist (created by `complete_invitation_setup`).

| Aspect | Detail |
|---|---|
| Isolation | `SET LOCAL transaction_isolation = 'serializable'` — partial UNIQUE on `team_members(user_id) WHERE left_at IS NULL` only catches duplicates AFTER the auto-decline cascade has run; serializable prevents the race where two concurrent accepts both pass the "no active membership" check. |
| Auth | row's `invited_user_id = auth.uid()`, `status='pending'`, `expires_at > now()`. **Reviewer-collision check**: if user has any `pending` `team_task_reviews` rows whose submitting team = `team_invitations.team_id`, RPC errors with `pending_review_against_target_team`. |
| Validates | `users.data.name` is set (i.e. profile setup completed). If not, errors with `profile_setup_incomplete` so the UI can route to `/profile-setup`. |
| Writes | UPDATE this row to `accepted`. UPDATE all OTHER `pending` invitations for this user to `auto_declined`. INSERT `team_members` (`team_role` from invitation's `proposed_role`, defaults to `'member'`, `joined_at=now()`). Transition user's `phase='team'` if currently `individual` or `awaiting_team`. INSERT activity_events (`invitation_accepted`, `team_member_joined`). INSERT notifications: `invitation_accepted` to inviter; `invitation_declined` (`metadata.auto=true`) to inviters of auto-declined rows. |
| Returns | new `team_members.id` |
| Errors | `invitation_expired`, `invitation_not_pending`, `pending_review_against_target_team`, `profile_setup_incomplete`, `cohort_mismatch_with_invitation` |

### `decline_invitation(p_invitation_id)`

Standard flip to `declined`, notify inviter.

### `cancel_invitation(p_invitation_id)`

| Aspect | Detail |
|---|---|
| Auth | caller is `invited_by_user_id` (or admin); status `pending` |
| Writes | flip to `cancelled`; notify invitee |

### `expire_pending_invitations()` *(cron)*

| Aspect | Detail |
|---|---|
| Auth | service role |
| Writes | For all `team_invitations WHERE status='pending' AND expires_at <= now()`: flip to `expired`; notify both parties |

### `leave_team(p_reason)`

| Aspect | Detail |
|---|---|
| Auth | caller has active `team_members` row; if caller is `founder`, must transfer first |
| Writes | UPDATE row: `left_at=now()`, `left_reason=p_reason` (`voluntary`); if user was last member, archive the team; transition phase appropriately |

### `admin_kick_member(p_team_id, p_user_id, p_reason)` `[admin]`

| Aspect | Detail |
|---|---|
| Auth | locked admin assertion |
| Writes | UPDATE `team_members`: `left_at=now()`, `left_reason='kicked'`. If kicked user was last active member, archive the team. Notify kicked member; activity event. |
| Why admin-only | Founders cannot kick — prevents factional power plays inside a team. Admin moderates. |

### `founder_transfer_team_founder(p_team_id, p_new_founder_user_id)` `[client]`

| Aspect | Detail |
|---|---|
| Auth | caller is current `founder` of `p_team_id`; new founder is currently active member of team |
| Writes | UPDATE `teams.founder_id`; flip both `team_members.team_role` values atomically; activity event (`team_role_changed`); notification to both parties |
| Errors | `not_team_founder`, `new_founder_not_active_member` |

### `admin_transfer_team_founder(p_team_id, p_new_founder_user_id)` `[admin]`

Same effect as `founder_transfer_team_founder`, but invoked by an admin (e.g. when the original founder is unreachable).

| Aspect | Detail |
|---|---|
| Auth | locked admin assertion |
| Writes | identical to founder version; activity event records `actor_user_id` as the admin |

### `founder_archive_team(p_reason)` `[client]`

| Aspect | Detail |
|---|---|
| Auth | caller is currently the `founder` of an active team. RPC infers `team_id` from caller's active membership — no user-supplied team_id (prevents archiving someone else's team). |
| Writes | UPDATE `teams.status='archived'`, `archived_at=now()`. For all active members: UPDATE `team_members.left_at=now()`, `left_reason='team_archived'`. Transition each member's phase to `awaiting_team` (or `graduated` if they had completed team journey). Activity events + notifications. |
| Errors | `not_team_founder`, `team_not_active` |

### `admin_archive_team(p_team_id, p_reason)` `[admin]`

| Aspect | Detail |
|---|---|
| Auth | locked admin assertion |
| Writes | identical to founder version; activity event records the admin as actor, `metadata.admin_initiated = true` |

---

## Weekly reports

### `precreate_weekly_reports()` *(cron, weekly)* `[cron]`

| Aspect | Detail |
|---|---|
| Auth | service role |
| Logic | Single set-based statement: `INSERT INTO weekly_reports (user_id, team_id, context, week_start_date, …) SELECT … FROM "users.data" u WHERE u.phase = 'team' AND u.status = 'active' ON CONFLICT (user_id, context, week_start_date) DO NOTHING`. NOT a per-user loop — at 10k users a loop holds locks for ~30s. After insert, single UPDATE: `UPDATE teams SET current_week = current_week + 1 WHERE status = 'active'`. |

### `submit_weekly_report(p_weekly_report_id, p_submission_data)`

| Aspect | Detail |
|---|---|
| Auth | row's `user_id = auth.uid()`, `status='pending'`, `now() <= due_at` |
| Writes | UPDATE `status='submitted'`, `submitted_at=now()`, `submission_data`. INSERT activity_events (`weekly_report_submitted`). No transaction (submission isn't directly rewarded). |

### `mark_weekly_reports_missed()` *(cron, daily after midnight)* `[cron]`

| Aspect | Detail |
|---|---|
| Auth | service role |
| Logic | Process in chunks of 500 with COMMIT between chunks (avoid one giant transaction at 10k+ rows). For each chunk: `SELECT id FROM weekly_reports WHERE status='pending' AND submitted_at IS NULL AND due_at <= now() FOR UPDATE SKIP LOCKED LIMIT 500`. The `submitted_at IS NULL` predicate is mandatory — prevents stomping a row that was just submitted. UPDATE `status='missed'`, `missed_at=now()`. Read penalty from `system_config`. Call `award_transaction` (`type='weekly_report_missed'`, negative deltas). Set `penalty_transaction_id`. INSERT notifications (`weekly_report_missed`). |

### `refund_weekly_report(p_weekly_report_id, p_reason)`

| Aspect | Detail |
|---|---|
| Auth | admin |
| Writes | UPDATE `status='refunded'`, `refunded_at=now()`. Call `award_transaction` (`type='reversal'`, positive deltas, `metadata.reverses_transaction_id = penalty_transaction_id`). Set `refund_transaction_id`. Notify user (`weekly_report_refunded`). |

### `send_weekly_report_reminders()` *(cron, daily)*

| Aspect | Detail |
|---|---|
| Logic | For `pending` rows where `due_at - now()` matches reminder windows (2 days / 1 day / today), insert `notifications` of the matching type. Idempotent via `(user_id, type, source_id)`. |

---

## Absences

### `register_excused_absence(p_calendar_event_id, p_session_title, p_absent_on, p_reason)` `[client]`

| Aspect | Detail |
|---|---|
| Auth | `auth.uid()` is the user; `absent_on >= today()` (no retroactive) |
| Concurrency | **`PERFORM pg_advisory_xact_lock(hashtextextended('absence:' \|\| auth.uid()::text, 0))`** before count + insert. Per-user advisory lock using 64-bit hash (no birthday collision until ~4B users). Released at commit. |
| Validates | active `excused` count for user < `users.data.absence_quota`; no existing row for `(user_id, calendar_event_id)` |
| Writes | INSERT `absences` (`type='excused'`, `recorded_by_user_id=auth.uid()`) |
| Errors | `quota_exceeded`, `already_registered`, `cannot_register_past_session` |

### `cancel_excused_absence(p_absence_id)`

| Aspect | Detail |
|---|---|
| Auth | row's `user_id = auth.uid()`, `type='excused'`, `cancelled_at IS NULL` |
| Writes | `cancelled_at=now()` (frees quota) |

### `record_unexcused_absence(p_user_id, p_calendar_event_id, p_session_title, p_absent_on)`

| Aspect | Detail |
|---|---|
| Auth | service role only (n8n) |
| Writes | INSERT `absences` (`type='unexcused'`, `recorded_by_user_id=NULL`) ON CONFLICT (user_id, calendar_event_id) DO NOTHING — if user already has an `excused` row for this event, skip |

---

## Client meetings

### `submit_client_meeting(...)` and `review_client_meeting(p_meeting_id, p_decision, p_feedback)`

| Aspect | Detail |
|---|---|
| submit auth | active member of `p_team_id` |
| submit writes | INSERT `client_meetings` (`status='pending_review'`); INSERT `activity_events` (`client_meeting_logged`); notify admin queue |
| review auth | admin |
| review writes (approve) | snapshot `xp_awarded_per_member` / `points_awarded_per_member` from `system_config`; for each active member call `award_transaction` (`type='meeting_attended'`, `context='team'`, source = this row); UPDATE row to `approved`; activity_events + notifications |
| review writes (reject) | UPDATE to `rejected`, store feedback; notify submitter |

---

## Revenue streams

### `submit_revenue_stream(...)` and `review_revenue_stream(p_revenue_id, p_decision, p_feedback)`

| Aspect | Detail |
|---|---|
| submit auth | active member of team; `proof_urls` non-empty |
| submit writes | INSERT `revenue_streams` (`pending_review`); activity event; admin notification |
| review auth | admin |
| review writes (approve) | UPDATE to `approved`; **NO transactions** (no XP for revenue); activity event (`revenue_approved`); notify all active team members |
| review writes (reject) | UPDATE to `rejected`; notify submitter |

---

## Strikes (admin)

### `issue_strike(p_team_id, p_severity, p_reason_category, p_reason_detail, p_expires_at, p_metadata)`

| Aspect | Detail |
|---|---|
| Auth | admin |
| Writes | INSERT `team_strikes`; for each active team member: INSERT activity event (`team_strike_issued`), notification (priority `high`) |

### `revoke_strike(p_strike_id, p_reason)`

| Aspect | Detail |
|---|---|
| Auth | admin |
| Writes | UPDATE `team_strikes` row: `revoked_at`, `revoked_by_user_id`, `revoked_reason`; fan out activity + notification |

---

## Tickets, suggestions

### `submit_ticket(p_category, p_priority, p_subject, p_message, p_attachments, p_source_table, p_source_id)`

| Aspect | Detail |
|---|---|
| Auth | authenticated user; check `support_rate_limits` for 15-min cooldown; if not allowed, raise |
| Writes | INSERT `support_tickets`; UPDATE `support_rate_limits` |

### Admin ticket RPCs

`assign_ticket(ticket_id, admin_id)`, `update_ticket_status(ticket_id, status)`, `resolve_ticket(ticket_id, note)`. Admin-only. Plain UPDATEs with auth check.

### `submit_task_edit_suggestion(p_source_table, p_source_id, p_target_field, p_suggestion_type, p_proposed_text, p_notes)`

| Aspect | Detail |
|---|---|
| Auth | authenticated user; suggestion submission rate-limited (similar pattern to tickets, optional) |
| Writes | INSERT row, status `pending` |

### `review_task_edit_suggestion(p_id, p_decision, p_feedback)`

| Aspect | Detail |
|---|---|
| Auth | admin |
| Writes | UPDATE row to `accepted` / `rejected` / `superseded`; notify submitter. Does NOT auto-apply the edit (admin manually copies into task). |

---

## Admin grants & system

### `admin_grant(p_user_id, p_xp_change, p_points_change, p_context, p_team_id, p_description)` `[admin]`

| Aspect | Detail |
|---|---|
| Auth | `SELECT primary_role FROM "users.data" WHERE id = auth.uid() FOR UPDATE` — lock + assert `'admin'`. Prevents admin-demoted-mid-RPC inconsistency. |
| Writes | call `award_transaction` (`type='admin_adjustment'`, `metadata.granted_by_user_id = auth.uid()`); activity event (`xp_adjustment`); notification to user |

### `admin_set_user_phase(p_user_id, p_phase)` / `admin_set_user_cohort(p_user_id, p_cohort_id)` / `admin_set_user_status(p_user_id, p_status)` `[admin]`

| Aspect | Detail |
|---|---|
| Auth | locked admin assertion + `SET LOCAL app.admin_rpc_in_progress = 'on'` so column-protect trigger permits the write |
| Writes | UPDATE `users.data` accordingly; activity_events + notifications where appropriate (`account_status_change`) |
| `admin_set_user_cohort` | also updates the denormalized `user_balances.cohort_id` for the user (same trigger pattern that propagates cohort changes) |

### `admin_set_user_role(p_user_id, p_new_role, p_cohort_id_if_demoting uuid DEFAULT NULL)` `[admin]`

**Note**: this RPC only DEMOTES (admin → user). Promotion (user → admin) is **manual via Supabase Studio** — see [user.data.md](user.data.md). There is deliberately no API surface for admin promotion.

| Aspect | Detail |
|---|---|
| Auth | locked admin assertion |
| Validates | `p_new_role` must be `'user'`; target's current role must be `'admin'`. `p_cohort_id_if_demoting` MUST be provided — without it, the `users.data` CHECK `primary_role = 'admin' OR cohort_id IS NOT NULL` would fail. |
| Writes | Single UPDATE setting both `primary_role='user'` and `cohort_id=p_cohort_id_if_demoting` atomically on `users.data`. Trigger propagates `cohort_id` to `user_balances` (same pattern as `admin_set_user_cohort`). Activity event (`account_status_change`). |
| Errors | `cohort_required_for_demotion`, `target_not_admin`, `cannot_promote_via_rpc` (if `p_new_role = 'admin'`) |

### `admin_update_system_config(p_key, p_value, p_description, p_value_type)`

| Aspect | Detail |
|---|---|
| Auth | admin |
| Writes | UPSERT `system_config`; sets `updated_by_user_id`, `updated_at` |

### `admin_create_cohort(p_name, p_description, ...)` / `admin_update_cohort(...)` / `admin_archive_cohort(...)` `[admin]`

Standard admin-managed lifecycle. All start with the `FOR UPDATE` admin assertion.

### `update_my_profile(p_name, p_avatar_url)` `[client]`

| Aspect | Detail |
|---|---|
| Auth | `auth.uid()` is the row owner |
| Writes | UPDATE `users.data` SET `name`, `avatar_url`, `updated_at = now()` WHERE `id = auth.uid()`. **Only these two columns** — bypasses the broad self-UPDATE RLS policy in favor of an explicit allowlist. |
| Why this exists | RLS UPDATE policies cannot restrict columns; trigger-based protection is brittle. A dedicated RPC is the cleanest enforcement. |

### `escalate_to_admin_review(p_team_task_progress_id)` `[internal]`

| Aspect | Detail |
|---|---|
| Trigger | Called by `submit_team_task_review` when rejection would push `submission_attempt = 4`. |
| Writes | UPDATE `team_task_progress.submission_attempt = 4`, `status='in_review'`. Call `assign_team_task_review` with reviewer_role override to `'admin'` so an admin reviewer is picked regardless of `task_type`. INSERT notification to admin queue. |
| Returns | new admin review id |

### `record_user_active()` `[client]`

Debounced — at most one write per user per 60 minutes regardless of call frequency.

| Aspect | Detail |
|---|---|
| Auth | `auth.uid()` is the user; no other validation |
| Writes | `UPDATE users.data SET last_active_at = now() WHERE id = auth.uid() AND last_active_at < now() - interval '60 minutes'`. The WHERE clause IS the debounce — concurrent callers will race but the second one's UPDATE will be a no-op. |
| Side effects | Sets `app.admin_rpc_in_progress = 'on'` because `last_active_at` is on `users.data` and `tr_protect_users_data_columns` blocks direct user updates. The flag is debatable here — `last_active_at` could be excluded from the protect list instead. **Decision: exclude `last_active_at` from the protected columns list** (low-risk, high-frequency write); no flag needed. |
| Returns | void |
| Why this exists | `auth.users.last_sign_in_at` updates only on actual sign-in; long-lived sessions never refresh it. We need a real "last active" signal for engagement metrics. |

### `maintain_partitions()` `[cron]`

Per [partitioning.md](partitioning.md). Runs weekly. Creates next month's partitions for all four partitioned tables (`transactions`, `activity_events`, `notifications`, `audit_log`) with **3-week lead time**. Idempotent via `CREATE TABLE IF NOT EXISTS`.

### `drop_old_partitions()` `[cron]`

Per [retention.md](retention.md). Runs monthly. Drops partitions past their retention window. Constant-time per drop. **Does NOT drop `transactions` partitions** — lifetime retention.

### `expire_notifications()` `[cron]`

Per [retention.md](retention.md). Runs daily. Hard-deletes notifications where `expires_at < now()` in chunks of 5000 with `LIMIT 50000` outer cap (prevents runaway loops if a backlog accumulated).

### `enqueue_audit_log_archive()` `[cron]`

Per [archive_audit_log.md](archive_audit_log.md). Runs monthly, after `drop_old_partitions`. Inserts a row into `partition_archive_queue` for each `audit_log_*` partition older than 180 days. The queue is consumed by an Edge Function that runs `pg_dump` → upload → `archive_audit_log_partition` (which calls `DROP TABLE`).

### `archive_audit_log_partition(p_partition_name text)` `[internal]`

Called by the Edge Function after successful S3 upload. Verifies partition is older than 180 days and the corresponding archive row exists in `partition_archive_queue` with status `'uploaded'`. Drops the partition.

---

## Reconciliation / audit

### `audit_user_xp_drift(p_cohort_id uuid)` *(admin / cron diagnostic)* `[cron]`

| Aspect | Detail |
|---|---|
| Auth | service role. `p_cohort_id` is REQUIRED for student users (cohort-scoped audits — global scans are explicitly disallowed; the daily cron loops active cohorts and calls per-cohort). To audit admin users (who have `cohort_id IS NULL`), pass `p_cohort_id = NULL` — handled by the separate `audit_admin_xp_drift()` wrapper below. |
| Logic | For every user in `p_cohort_id`, compare `user_balances.{individual,team}_{exp,points}` to `SUM(transactions.{xp,points}_change WHERE cohort_id = p_cohort_id)` grouped by `context`. Returns rows where the cache disagrees with the ledger. **Should always return zero rows in healthy state.** Cohort-scoped means at 2k students × 5 cohorts = 5 fast scans per day, not one full-DB scan. |
| Returns | TABLE of `(user_id, individual_exp_drift, team_exp_drift, individual_points_drift, team_points_drift)` |
| Errors | `cohort_required` (unless caller is `audit_admin_xp_drift`) |

### `audit_admin_xp_drift()` *(admin / cron diagnostic)* `[cron]`

Companion to `audit_user_xp_drift` for admin balances (which have NULL cohort_id and thus appear in no per-cohort scan).

| Aspect | Detail |
|---|---|
| Auth | service role |
| Logic | Same drift comparison as `audit_user_xp_drift`, but scoped to `WHERE u.cohort_id IS NULL AND u.primary_role = 'admin'`. Admins are typically <10 users, scan is trivial. |
| Schedule | Runs daily after the cohort loop. |

### `audit_orphan_polymorphic_sources(p_cohort_id uuid)` *(admin / cron diagnostic)* `[cron]`

### `audit_orphan_polymorphic_sources(p_cohort_id uuid)` *(admin / cron diagnostic)* `[cron]`

| Aspect | Detail |
|---|---|
| Auth | service role; `p_cohort_id` required |
| Logic | For each row in `transactions`, `activity_events`, `notifications`, `task_edit_suggestions`, `support_tickets`, `team_strikes` where `cohort_id = p_cohort_id` AND `source_table IS NOT NULL`: dispatch via `CASE source_table` and verify the source row exists. Returns dangling references. Note: `transactions` is never partition-dropped, so back-references from consuming tables (`team_task_reviews.transaction_id`, etc.) can NEVER orphan; that direction is safe by design (lifetime retention) and is NOT included in this audit. |
| Returns | TABLE of `(table_name, row_id, source_table, source_id)` |
| Schedule | Weekly per cohort. |

### `audit_recompute_user_caches(p_user_id)` *(admin recovery tool)*

| Aspect | Detail |
|---|---|
| Auth | admin |
| Logic | Recomputes the four cache columns for one user from `transactions`. Used to fix drift detected by `audit_user_xp_drift`. |

---

## What this catalog does NOT include

| Concern | Why |
|---|---|
| Authentication (signup, login, password reset) | Supabase auth handles |
| File uploads | Supabase Storage signed-URL flow; no DB RPC |
| Real-time subscriptions | Supabase Realtime; reads only |
| Pure read RPCs (e.g. dashboard aggregates) | These can be regular SQL functions or app-side queries; only writes need DEFINER |
