# Two Economies — My Journey vs Team Journey

**Date:** 2026-08-27
**Status:** Approved in chat (sections 1–6), spec for implementation
**Depends on:** batch close (`2026-08-27-batch-close-design.md`) — shipped.

## Problem

Students see three different numbers all called "XP": the combined wallet
(dashboard, individual leaderboard, profile), My Journey's individual-only
sum, and Team Journey's team-only sum. The programme actually has two phases
with two economies:

1. **My Journey** — solo preparation. Student earns *My Journey XP* and
   *My Journey Credits* from individual tasks. No weekly reports, no strikes.
2. **Team Journey** — the startup phase. Student earns *Team XP* and
   *Team Points* with their team. Graduation (8,000) is Team XP. Weekly
   reports and strikes live here.

Phases are switched **manually by an admin** — no threshold, no automation.

## Decisions (from brainstorm)

| Topic | Decision |
|---|---|
| Leaderboard | Two boards named like the nav: **My Journey** (students by My Journey XP, live only) and **Team Journey** (Teams + Members by Team XP). Combined-XP "Individual" tab removed. |
| Naming | Same units, always prefixed: "My Journey XP / My Journey Credits", "Team XP / Team Points". No bare "XP" student-facing. |
| My Journey goal | Completion: "X of Y individual tasks" progress bar. No XP target. |
| My Journey Credits | Kept as a displayed score, no sink. |
| Switch | Global `platform_settings` row + admin toggles. Nav, boards, dashboard cards, weekly reports/strikes all read it. |
| Balances | Four stored columns on `users`, maintained by ONE trigger on `transactions`; reward RPCs untouched. |
| Economy rule | `transactions.activity_type = 'individual'` → My Journey; anything else → Team. (Not `team_id` — peer-review `validation` and team `admin_grant` rows have `team_id NULL`.) |
| Weekly reports & strikes | A Team Journey feature: active iff `team_journey` is on. Individual weekly reports removed from My Journey entirely (0 were ever submitted). |
| My Journey UI | Same layout/components as Team Journey detail page, own data, **one tab: Tasks**. |
| Dashboard home | Two cards, "My Journey" and "Team Journey", each hidden by the switch. |

## Current state (verified 2026-08-27)

- `users.total_xp / total_points` = single combined wallet, updated inside six reward RPCs (`complete_individual_task`, `submit_external_peer_review`, `award_client_meeting_rewards`, `distribute_team_rewards[_v2]`, `create_team_atomic`) plus `increment_user_points`. Guarded by `prevent_sensitive_column_updates` (allows `current_user = 'postgres'`).
- Ledger labels: `transactions.activity_type` (`individual`|`team`), `points_type`, `team_id`. Batch 2 ledger: 0 individual task rows (no active individual task templates); `validation` (1,562 rows, team, `team_id NULL`), team `admin_grant` (42 rows, `team_id NULL`).
- Sidebar (`src/components/app-sidebar.tsx`): "My Journey" item has `hidden: true` today; "All Teams" + dynamic "<Team> Team" visible.
- Leaderboard: tabs Individual (`get_live_leaderboard_data` / `get_leaderboard_data` by `total_xp`) and Teams (`get_live_team_leaderboard_data` / `get_team_leaderboard_data`). Snapshots: `leaderboard_snapshots(total_xp, total_points, …)` written Monday by `generate_weekly_leaderboard_snapshots`.
- Graduation: `get_user_progress_details` computes `xp_progress_percent = total_xp / 8000`; admin modals show "/ 8,000 XP". `check_missed_weekly_reports_team_context`, `send_weekly_report_reminders[_sunday]` exempt `total_xp >= 8000`. `WeeklyReportBanner` mirrors 8000. Diploma RPC does **not** use XP.
- `get_dashboard_overview(p_user_id)` returns `total_xp, total_points, …, teams_data` (team_xp/team_points per team computed from ledger).
- My Journey page (850 lines) has tabs Achievements / Weekly Reports (individual) / Strikes, individual weekly report modal, "Set Status" button, pink theme. Team Journey detail page (1,980 lines) has Tasks / Weekly Reports / Client Meetings / Strikes.
- No settings table exists.

## Section 1 — `platform_settings` + switch

```sql
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into platform_settings(key, value)
values ('journeys', '{"my_journey": false, "team_journey": true}');
```
Defaults mirror today's visibility (My Journey link is hidden already). RLS: `select` for `authenticated`; no direct writes. RPC `set_platform_setting_v1(p_key text, p_value jsonb)` — admin-only (`is_admin_v1()`), upserts, stamps `updated_by`. Helper `journey_enabled_v1(p_journey text) returns boolean` (SQL, STABLE, SECURITY DEFINER) used by the DB guards below.

**Readers**
- `usePlatformSettings()` hook → `{ myJourney: boolean, teamJourney: boolean }`, React Query key `["platform-settings"]`, 5-min stale, `enabled: mounted`. Server pages use `getJourneySettings()` (server client).
- Sidebar: "My Journey" ↔ `myJourney` (replaces the hard-coded `hidden: true`); "All Teams" and "<Team> Team" ↔ `teamJourney`.
- Pages `/dashboard/my-journey`, `/dashboard/team-journey/**`: redirect to `/dashboard` when their journey is off (admins exempt).
- Leaderboard boards, dashboard cards: see sections 3, 6.
- **Weekly reports & strikes off while `team_journey` is off:** one guard line `IF NOT journey_enabled_v1('team_journey') THEN RETURN; END IF;` at the top of `check_missed_weekly_reports_team_context` (returns empty → the Monday edge function creates 0 strikes), `send_weekly_report_reminders`, `send_weekly_report_reminders_sunday` (return 0). Pre-edit copies saved as `*_backup_v2`. `WeeklyReportBanner` renders nothing when off. Team Journey Weekly Reports / Strikes tabs and the header "Weekly Report" block hidden when off.
- Admin home: "Programme phase" card with two `Switch`es (My Journey / Team Journey) + last-changed info; mutation calls `set_platform_setting_v1`, toasts, invalidates `["platform-settings"]`.

## Section 2 — two economies (data)

```sql
alter table users
  add column my_journey_xp integer not null default 0,
  add column my_journey_credits integer not null default 0,
  add column team_xp integer not null default 0,
  add column team_points integer not null default 500; -- starting capital moves to the team economy
```

Trigger `trg_transactions_split_economy` on `transactions` **AFTER INSERT OR DELETE**, function `transactions_split_economy_v1()` (SECURITY DEFINER, owner postgres):
- INSERT: `activity_type = 'individual'` → `my_journey_xp += xp_change`, `my_journey_credits += points_change`; else → `team_xp += xp_change`, `team_points += points_change`.
- DELETE: reverse. (Transactions are deleted only by tests and dropout hard-deletes; keeps balances honest.)
- UPDATE of `xp_change/points_change` is not supported today anywhere; not handled (documented).

`prevent_sensitive_column_updates` extended: the four new columns raise on direct change (same `current_user = 'postgres'` bypass). Pre-edit copy `prevent_sensitive_column_updates_backup_v1`.

**Backfill** (same migration): per user, `my_journey_* = SUM(individual rows)`, `team_xp = SUM(team rows xp)`, `team_points = 500 + SUM(team rows points)`. Verify: `SUM(my_journey_xp + team_xp) = SUM(total_xp)` for students (allowing for the 500 default and any pre-ledger admin edits — report the diff, don't force it).

`total_xp / total_points` stay as the legacy combined wallet (still written by the reward RPCs), used only in admin reconciliation. Not shown to students anymore.

## Section 3 — leaderboard

Page structure (`page-client.tsx`): top-level `Tabs` **My Journey** | **Team Journey**, each rendered only if its journey is on (if only one is on, no top-level tabs, just a title). Team Journey has sub-tabs **Teams** (existing board + week selector, unchanged) and **Members**.

New RPCs:
- `get_live_my_journey_leaderboard_v1(p_limit int default 50)` → `rank_position, user_id, user_name, user_avatar_url, my_journey_xp, my_journey_credits, tasks_completed (individual approved)`. Filters `status='active'`, `primary_role='user'`, confirmed email. Live only, no week selector.
- `get_live_team_members_leaderboard_v1(p_limit)` → same shape as `get_live_leaderboard_data` but `total_xp := team_xp`, `total_points := team_points` (copy of the existing body with the two column swaps). Historical weeks continue to use `get_leaderboard_data` (snapshots).
- `generate_weekly_leaderboard_snapshots_v2` = existing body with `total_xp := team_xp`, `total_points := team_points`; cron jobs 3 and 6 re-pointed to `_v2`. Snapshot column names unchanged; from the first Batch 3 Monday they hold Team XP. Historical rows untouched (Batch 2 individual XP was ~0, so history reads the same).

Column headers: "Team XP", "Team Points", "My Journey XP", "My Journey Credits".

## Section 4 — naming + graduation

- Grep-and-replace of student-facing "XP"/"Points"/"Credits" labels in: dashboard cards, My Journey stats, Team Journey stats + header blocks, leaderboard headers, transaction history, task detail/preview reward chips ("+50 Team XP" vs "+50 My Journey XP" chosen by task `activity_type`), achievement cards, admin user/team modals ("Team XP / 8,000").
- `get_user_progress_details`: `xp_progress_percent` from `team_xp`; response gains `my_journey_xp, my_journey_credits, team_xp, team_points`. Pre-edit copy `_backup_v1`.
- `get_dashboard_overview_v2(p_user_id)` = v1 + the four columns; `src/app/dashboard/page.tsx` switches to v2.
- Weekly-report 8,000 exemption (`check_missed…`, both reminders, `WeeklyReportBanner`) reads `team_xp`.
- `useApp()` profile select adds the four columns.

## Section 5 — My Journey page rebuilt

`/dashboard/my-journey/page.tsx` rewritten (< 300 lines) on the Team Journey detail layout, reusing the same components: breadcrumb ("My Journey"), header (avatar, name, "My Journey" badge, no Set Status / no report button), `StatsCardComponent` grid (My Journey XP, My Journey Credits, Tasks completed X/Y, Achievements), two info cards (Progress: task completion bar; Economy explainer: one paragraph on what My Journey XP is and that Team XP comes later), then a **single Tasks tab** = the Team Journey tasks tab (header + refresh, `AchievementCard` grid + filter banner, `TasksTable`, `TaskPreviewModal`) fed by the existing `getUserTasksVisible / getUserIndividualTasks / getUserAchievementProgress / getUserTaskCompletionStats`.

Shared extraction (small, both pages use it): `src/components/journey/achievements-grid.tsx` (grid + skeleton + filter banner). Team Journey page keeps its 4 tabs; only change there is hiding Weekly Reports/Strikes when `teamJourney` is off (§1) and the label renames (§4).

Deleted: individual weekly report modal/table usage from My Journey and dashboard home (`IndividualWeeklyReportModal` import in `dashboard/page.tsx`), `src/data/my-journey-data.ts` mock strikes, `Strike` type if unused.

## Section 6 — dashboard home

`statsCards` becomes: **My Journey** card (My Journey XP · Credits · tasks done, link → /dashboard/my-journey) and **Team Journey** card (Team XP · Team Points · team name, link → team page), each rendered only when its journey is on; Achievements/Tasks cards keep their current meaning under Team Journey. "Your Teams Progress" unchanged apart from labels ("Team XP/Team Points" already).

## Section 7 — testing & verification

- No DB-writing Vitest runs unless the user asks (standing rule). Verification via `tsc`, lint, and read-only SQL:
  - after backfill: per-economy sums vs ledger; sample 3 users by hand.
  - trigger: insert one `test_` transaction inside a transaction block via MCP, check the balance moved, `ROLLBACK`.
  - `journey_enabled_v1('team_journey')` false → `check_missed_weekly_reports_team_context()` returns 0 rows (inside a transaction that flips the setting and rolls back).
- Manual on develop preview: flip switches, check nav/leaderboard/dashboard react; My Journey page renders with an individual task template created in admin.

## Rollout

1. Migrations (settings, columns + trigger + backfill, RPCs) — all additive; `_backup_*` copies for every edited function; cron re-point is the only mutation of existing behaviour and only affects future Mondays.
2. Regenerate types; app code; `npm run build`.
3. Push develop → verify → master. Then create individual task templates in admin and flip My Journey on when Batch 3 starts.

## Risks

| Risk | Mitigation |
|---|---|
| Trigger double-counts with reward RPCs | It only writes the four **new** columns; RPCs only write `total_*`. Independent. |
| Backfill doesn't reconcile with `total_xp` | Report the per-user diff; historical admin edits to `total_xp` outside the ledger are the known cause. Batch 3 starts from zero anyway. |
| Snapshot semantics change mid-history | Column keeps its name; only future rows switch to Team XP. Batch 2 individual XP ≈ 0 so history is visually identical. |
| Guards silently disable weekly reports in prod | Default `team_journey: true`; guards are one line each with `_backup_v2` copies. |
| My Journey rewrite breaks task start/complete flows | Reuses existing data functions + `TasksTable`/`TaskPreviewModal`; individual task RPCs unchanged. |
| Batch 3 students' `team_points` default 500 while `total_points` also 500 | Both are the starting capital; `total_*` no longer shown. |

## Out of scope

Automatic phase transitions; Credits sink; `teams.team_points` dead column; admin analytics wording; renaming DB enums; deleting `total_xp/total_points`.
