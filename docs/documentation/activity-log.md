# Activity Log (admin)

> `/dashboard/admin/audit-logs` shows one plain-English sentence per thing that happened on the platform, grouped by day: who did what, to which student, with what result. It is fed by `get_admin_activity_v1`, which reads the tables where events actually live, not the trigger-based `audit_log`.

Shipped 2026-09-24. Replaces the old audit-log viewer (same route, same sidebar entry).

## Why it was rebuilt

The previous page read only `audit_log`, which is written by triggers on just four tables (`users`, `teams`, `team_members`, `team_invitations`). Task, strike, report and meeting events never existed there; 78% of rows had no actor; XP column churn showed as "profile updated"; the user filter matched the actor, not the affected student; and Vitest's `test_*` accounts polluted the top of the feed.

## Data source

`get_admin_activity_v1(p_user_id, p_kinds text[], p_from, p_to, p_limit, p_offset)` — SECURITY DEFINER, raises `Unauthorized` for non-admins, EXECUTE authenticated + service_role. It unions events from:

| Kind(s) | Source |
|---|---|
| `task_started`, `task_submitted` | `task_progress.started_at` / `submitted_at` |
| `task_approved`, `task_rejected` (team) | `task_progress.status` + `reviewer_user_id` (peer review) |
| `task_approved`, `task_rejected` (solo) | `ai_task_reviews` rows with a decision (one per attempt) |
| `xp` | `transactions` (economy from `activity_type`) |
| `strike_issued`, `strike_explained`, `strike_resolved` | `team_strikes` |
| `meeting_logged` | `client_meetings` (not deleted) |
| `weekly_report` | `weekly_reports` where `status = 'submitted'` |
| `achievement` | `user_achievements` |
| `ticket`, `ticket_resolved`, `suggestion`, `suggestion_reviewed` | support inbox tables |
| `startie_chat` | `assistant_threads` |
| `account_joined`, `account_status`, `account_role`, `account_batch`, `account_name`, `team_joined`, `team_left` | `audit_log`, reduced to the rows that matter |

Every row carries the **subject** (the student it happened to), the **actor** (who did it, null = system / AI), team, object title, XP/points amounts, status, a detail text and a `ref_id`. Filtering by student means events *about* that student. Test accounts (`test_%@test.local`) and `[TEST]%` teams are excluded. Names fall back to the email local part when a user has no name yet. ~85 ms for a page of 50.

`get_users_for_filter` (shared by other admin pages) now also hides test accounts.

## Client

- `src/lib/activity/format.ts` — `formatActivity(row)` → `{ text, badge, tone, detail, href }`; `ACTIVITY_KINDS`, `ACTIVITY_GROUPS` (badge groups the filter chips are built from). Add a sentence here when a new kind is added to the RPC.
- `src/hooks/use-admin-activity.ts` — `useAdminActivity(filters)` (infinite query, 50 per page, asks for 51 to know if more exist) and `useUsersForFilter()`.
- `src/components/admin/activity/` — `activity-filters.tsx` (student, dates, kind chips), `activity-list.tsx` (day groups, Load more, `groupByDay`), `activity-row.tsx` (time, badge, sentence, expandable detail, link).
- Page: `src/app/dashboard/admin/audit-logs/page.tsx`.
- Tests: `tests/admin/activity-format.test.ts`, `activity-list.test.tsx`, `activity-rpc.test.ts` (DB, with cleanup).

## Left in place

`get_audit_logs_v2` and `get_rewards_activity` still exist in the database but nothing calls them. Drop them once the new page has been in use for a while. The `audit_log` triggers are untouched.

## Rollback

Revert the app code (git) and `drop function public.get_admin_activity_v1(uuid, text[], timestamptz, timestamptz, int, int);`. To restore `get_users_for_filter`'s previous behaviour, re-create it without the `test\_%@test.local` predicate (body in migration `admin_batch_scope_v1` / git history).
