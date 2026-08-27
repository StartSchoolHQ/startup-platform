# Batch Close — Archive a Cohort's Users and Products

**Date:** 2026-08-27
**Status:** Draft, awaiting review
**Scope:** Tag users/teams with a batch, close a batch (archive + lock out), admin visibility of past batches.

## Problem

Batch 2 (the platform's first cohort, diplomas issued as `B1` / "Mercury-Redstone")
is finished. Batch 3 is starting. Today every user is `status = 'active'` and
nothing distinguishes cohorts. We need to:

1. Stop Batch 2 students from logging in (they have their diplomas; no alumni access needed).
2. Archive their products (teams).
3. **Keep every row.** Admins must still be able to open every past user and product.
4. Do the same again for Batch 3, Batch 4, … without another one-off migration.

## Decisions already made

| Decision | Choice |
|---|---|
| Graduates' platform access | Fully locked out (auth ban). No read-only alumni mode. |
| Cohort tagging | Yes — `batch_id` on `users` and `teams`, reusing `diploma_batches` as the batch table. |
| When a batch is assigned | Lazily, at close time. `batch_id IS NULL` = current cohort or staff. No `is_current` flag, no trigger on signup. |
| Exceptions (staff, early Batch 3 joiners like Liga Letina) | Handled by unchecking them in the close-batch preview — no new "staff" flag. |
| Deletion | None. Nothing is deleted or moved. Everything is reversible. |

## Current state (verified against prod, 2026-08-27)

- `users.status` enum `status_state` = `active | archived`. 75 users, all `active` (6 admins, 69 users). Never used.
- `teams.status` + `teams.archived_at` exist. 43 teams: 36 active, 7 archived (dissolved, `member_count = 0`).
- `diploma_batches`: one row — `Mercury-Redstone`, prefix `B1`, 2025-09-01 → 2026-08-31, 9 diplomas. FK `diplomas.batch_id → diploma_batches` (NO ACTION).
- `auth.users.banned_until`: nobody banned.
- RLS: `p_users_select_public_progress` exposes only `status='active'` users to other users; own-row read always allowed. `teams` has both `p_teams_read_active` and `p_teams_read_authenticated (true)` — archived teams are readable by everyone; the "active" policy is redundant.
- Filtering on `status='active'` already exists in: `get_live_leaderboard_data`, `get_live_weekly_leaderboard_data`, `generate_weekly_leaderboard_snapshots`, `get_users_for_filter`, `check_missed_weekly_reports_team_context` (team status), `send_weekly_report_reminders[_sunday]` (team status), `get_admin_program_health_v2`, `get_live_team_leaderboard_data`.
- **Not** filtering: `get_dashboard_overview`, `get_students_health_overview_v2`, `get_teams_with_stats` (admin — correct, it should show all).
- `prevent_sensitive_column_updates` trigger on `users` blocks `status` changes unless the caller is `postgres` (SECURITY DEFINER function) or the user themselves.
- Admin users API (`/api/admin/users`) computes `status` from `auth.email_confirmed_at`, ignores `users.status`.
- Admin teams API uses `get_teams_with_stats` (RLS-respecting server client — fine because of `p_teams_read_authenticated`).
- Teams containing admins: `[TEST] Test product` (Eliass Baranovs, Eliass Test), `Janis - Test product` (Jānis Altgauzens). These stay active.
- Liga Letina (`user`, created 2026-08-27, no team) is the first Batch 3 user. Stays NULL / active.

## Section 1 — Data model

Migration `batch_close_schema_v1` (additive only):

```sql
alter table diploma_batches add column closed_at timestamptz;
alter table users add column batch_id uuid references diploma_batches(id) on delete restrict;
alter table teams add column batch_id uuid references diploma_batches(id) on delete restrict;
create index users_batch_id_idx on users(batch_id);
create index teams_batch_id_idx on teams(batch_id);
```

- `on delete restrict` — a batch with members can never be dropped.
- `status` / `archived_at` remain the archive mechanism; no new enum values.
- Table keeps the name `diploma_batches`. Renaming adds risk (FK, types, diploma code) and buys nothing.

**Backfill** (same migration, data only, does **not** archive anything):

```sql
-- Mercury-Redstone = eb55d8e2-bfb2-4567-8678-420216293d78
-- Liga Letina      = c51d3c72-d2c7-4723-aee4-bf303e6cb4e2
update teams set batch_id = 'eb55d8e2-bfb2-4567-8678-420216293d78' where batch_id is null
  and id not in (select team_id from team_members tm join users u on u.id = tm.user_id
                 where u.primary_role = 'admin' and tm.left_at is null);
update users set batch_id = 'eb55d8e2-bfb2-4567-8678-420216293d78' where batch_id is null
  and primary_role = 'user' and id <> 'c51d3c72-d2c7-4723-aee4-bf303e6cb4e2';
```

Expected result: 41 teams tagged (incl. the 7 dissolved ones — they are Batch 2 history), 68 users tagged, 6 admins + Liga + 2 test teams stay NULL. Verify counts before and after.

The `update users` runs as `postgres` in the migration so the sensitive-column trigger doesn't fire (batch_id isn't a guarded column anyway).

## Section 2 — Close batch (RPCs)

Two new SECURITY DEFINER functions, admin-only (check `primary_role = 'admin'` on `auth.uid()`), `EXECUTE` granted to `authenticated`. Nothing existing is modified (V2 pattern — these are net-new).

### `close_batch_v1(p_batch_id uuid, p_user_ids uuid[], p_team_ids uuid[]) returns jsonb`

One transaction:

1. Assert caller is admin; assert batch exists and `closed_at IS NULL`.
2. Assert no `p_user_ids` is an admin (refuse the whole call if so — never lock out an admin by accident).
3. `update users set batch_id = p_batch_id, status = 'archived', updated_at = now() where id = any(p_user_ids) and status = 'active'`.
4. `update teams set batch_id = p_batch_id, status = 'archived', archived_at = now() where id = any(p_team_ids) and status = 'active'`.
   Already-archived (dissolved) teams are not touched — their `archived_at` is history.
5. `update diploma_batches set closed_at = now() where id = p_batch_id`.
6. Return `{ users_archived, teams_archived }`.

The caller passes explicit ID lists (what the admin saw and confirmed in the preview), not a rule. The function does not decide who gets archived; the admin does.

### `reopen_batch_v1(p_batch_id uuid) returns jsonb`

Rollback: sets `status = 'active'` on users/teams with that `batch_id` **and** `status = 'archived'` **and** (for teams) `archived_at >= closed_at` — so the 7 pre-existing dissolved teams are not resurrected. Clears `closed_at`. Keeps `batch_id` (the tag is correct regardless). Returns counts.

### `get_batch_close_preview_v1() returns jsonb`

Admin-only. Returns the candidate lists for the dialog:
- users: `status = 'active' and primary_role = 'user' and batch_id is null` → `id, name, email, team names`
- teams: `status = 'active'` → `id, name, member_count, member names, has_admin_member boolean`

Teams with an admin member are returned with `has_admin_member = true` and default to **unchecked** in the UI.

## Section 3 — API + auth ban

`POST /api/admin/batches/[id]/close` — body `{ userIds: uuid[], teamIds: uuid[] }`, Zod-validated.

1. `createClient()` → `getUser()` → verify admin from `users` table.
2. `rpc('close_batch_v1', …)` with the server client (SECURITY DEFINER handles privileges). If it errors, stop; nothing was banned.
3. `createAdminClient()` → for each `userId`: `auth.admin.updateUserById(id, { ban_duration: '876000h' })` (~100 years; Supabase has no "permanent" literal). Sequential, collect failures.
4. Also `auth.admin.signOut`-equivalent isn't available per-user server-side; existing sessions die on next token refresh (≤ 1 h). Acceptable.
5. Return `{ users_archived, teams_archived, banned, banFailures: [{id, email, error}] }`.

`POST /api/admin/batches/[id]/reopen` — mirror: `rpc('reopen_batch_v1')`, then `ban_duration: 'none'` for every user with that `batch_id`.

`POST /api/admin/batches/[id]/retry-bans` — re-runs the ban loop for users of the batch whose `banned_until` is null. Makes the ban step idempotent and recoverable without touching the DB state.

DB archive is the source of truth. The ban is a best-effort side effect that can be re-run.

## Section 4 — Admin UI

Minimal. Reuse what exists.

1. **Diplomas → Setup tab** (`setup-tab.tsx` / `batch-form.tsx`) already lists and creates batches. Add per batch:
   - a "Closed on …" line when `closed_at` is set, otherwise a **Close batch** button → `CloseBatchDialog`.
   - a **Reopen** button on closed batches (behind a confirm step in the dialog, not `confirm()`).
2. **`CloseBatchDialog`** (new, `src/components/admin/close-batch-dialog.tsx`): loads `get_batch_close_preview_v1`, shows two checkbox lists (users, teams) with search, admin-member teams unchecked by default, summary counts, a typed-confirmation ("type the batch name"), then calls the close route. Shows `isPending`, then a result summary with any ban failures and a **Retry bans** button. Toasts on success/error.
3. **Admin users table** (`/api/admin/users` + `admin-users-table.tsx`): return `users.status` and `batch_name` alongside the existing email-confirmed state. Filter dropdown gains `Archived` and one entry per batch. Row badge: `Archived · Mercury-Redstone`.
4. **Admin teams table** (`get_teams_with_stats` → add `batch_id`, `batch_name` to output; `admin-teams-table.tsx`): same filter and badge. `get_teams_with_stats` output shape change is additive (new columns only) — existing callers unaffected. If the RPC's return type is a fixed table type, create `get_teams_with_stats_v2` instead and switch the one caller.
5. **Detail modals** (`user-detail-modal.tsx`, `team-details-modal.tsx`): show batch + archived date in the header. No other change — they already load everything via admin routes.
6. **Login page**: Supabase returns `"User is banned"` on sign-in for banned accounts. Map that to a friendly message: "This account belongs to a completed programme batch and is no longer active. Contact StartSchool if you need something."

## Section 5 — Gaps to close in the same PR

- `get_users_for_filter` (admin analytics user picker) filters `status='active'` — admins lose the ability to pick Batch 2 users. Add optional `p_include_archived boolean default false`; analytics UI passes `true` when a past batch is selected. (Small, and the whole point is admins can still see everything.)
- `get_dashboard_overview` — teammates of an archived user would still see them in team member lists. After the ban they're locked out anyway and their teams are archived too, so a Batch 3 user never shares a team with a Batch 2 user. **No change** — noting it as a known non-issue.
- `get_students_health_overview_v2` (admin) — add `where u.status = 'active'` so the health dashboard reflects the current cohort. Past-batch health is visible via the users table filter, not the health dashboard.
- Drop the redundant `p_teams_read_active` policy? **No.** Out of scope; harmless.

## Section 6 — Testing

- Vitest (service role), `tests/batch-close.test.ts`:
  - create `test_` batch + `test_` users/teams; `close_batch_v1` archives exactly the given IDs, sets `closed_at`, leaves untouched rows alone; already-archived team keeps its `archived_at`.
  - refuses when an admin ID is in `p_user_ids`; refuses when batch already closed; refuses for non-admin caller.
  - `reopen_batch_v1` restores only rows archived by the close (dissolved team stays archived); clears `closed_at`.
  - archived user disappears from `get_live_leaderboard_data`; archived team disappears from `check_missed_weekly_reports_team_context`.
  - cleanup in `afterEach`, FK order respected.
- Manual on develop preview: run the real Batch 2 close with the dialog, then log in as an archived test account → banned message; confirm cron jobs that Monday create 0 strikes for Batch 2 teams.

## Rollout order (prod, same DB for develop/master)

1. Manual Supabase backup.
2. Apply `batch_close_schema_v1` (columns + backfill). Verify: 68 users / 41 teams tagged, 0 status changes.
3. Apply RPC migration (`close_batch_v1`, `reopen_batch_v1`, `get_batch_close_preview_v1`, `get_users_for_filter` param, `get_students_health_overview_v2` filter). Regenerate `src/types/database.ts`.
4. Deploy app to develop; run the Vitest suite.
5. Admin opens Diplomas → Setup → Mercury-Redstone → Close batch. Reviews the preview (expects 68 users, 34 teams checked; 2 test teams unchecked; Liga absent). Confirms.
6. Verify: `select status, count(*) from users group by 1` → 68 archived; `select count(*) from auth.users where banned_until > now()` → 68. Test login as one archived account.
7. Merge to master.

## Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Data loss** | Very low | Critical | No DELETE anywhere in the design. Migration is additive (new nullable columns). Close/reopen are UPDATEs on `status`/`archived_at`/`batch_id`/`closed_at` only. FKs are `on delete restrict`. Manual backup before step 2 regardless. |
| 2 | Wrong user archived/banned (e.g. Liga, a staff account, a Batch 3 early joiner) | Low | Medium, reversible | Preview lists exactly who; admin unchecks; RPC refuses admin IDs outright; `reopen_batch_v1` + `ban_duration: 'none'` fully reverses. |
| 3 | Ban step partially fails (Auth API error mid-loop) | Low | Low | DB state is truth; failures returned to UI; **Retry bans** route is idempotent. Worst case a graduate can log in for a while and sees an archived, read-only-by-accident team — no data harm. |
| 4 | Archived user still has a live session | Certain, short | Negligible | Access tokens expire ≤ 1 h; refresh fails once banned. |
| 5 | `prevent_sensitive_column_updates` blocks the status update | Medium if done wrong | Blocks feature | RPCs are SECURITY DEFINER owned by `postgres` → trigger's `current_user = 'postgres'` branch allows it. Tested in Vitest. |
| 6 | Admin UI stops showing archived users | Medium (exists today) | Defeats "save everything for our use" | `/api/admin/users` and `get_users_for_filter` explicitly changed to include archived + batch filter. Teams already visible via `p_teams_read_authenticated`. |
| 7 | Leaderboard / weekly snapshots / reminder crons misbehave | Low | Low | All already filter `status = 'active'`; archiving makes Batch 2 vanish from them, which is the desired effect. Monday cron (`weekly-strikes-automation`) verified: filters `t.status = 'active'`. |
| 8 | Reopen resurrects the 7 old dissolved teams | Low | Low | Reopen only touches teams with `archived_at >= closed_at`. Tested. |
| 9 | `get_teams_with_stats` return-type change breaks the admin teams page | Low | Low | Additive columns; if the RPC uses a fixed `RETURNS TABLE`, ship `_v2` and switch the single caller. |
| 10 | Batch 3 user is invited into an archived Batch 2 team | Very low | Low | Team invitations target teams by ID from the founder's UI; archived teams' founders are banned. Not adding a guard now; note for later. |
| 11 | Same DB for develop/master: closing on develop **is** closing prod | Certain | By design | Step 5 is the real operation; run it once, on purpose, after the preview looks right. |

## Out of scope

- Alumni read-only mode.
- Automatic batch assignment at signup (`is_current`).
- Resetting task templates / achievements / recurring tasks for Batch 3.
- Deleting or anonymising any Batch 2 data (GDPR retention is a separate conversation).
- Renaming `diploma_batches`.
