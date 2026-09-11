# Admin panel

Restructured 2026-09-11. The panel is grouped by what an admin is doing, not by
database table, and the overview only shows the journey that is switched on.

## Sections (sidebar order)

| Section | Page | Route | What it holds |
|---|---|---|---|
| — | Overview | `/dashboard/admin` | Students health card; My Journey block; Team Journey block |
| Curriculum | Tasks | `/dashboard/admin/tasks` | Solo tasks / Team tasks / Suggestions. Opens on the running journey |
| Curriculum | AI Reviews | `/dashboard/admin/ai-reviews` | Read-only audit of every automatic review |
| Curriculum | Peer Reviews | `/dashboard/admin/peer-reviews` | Team-task peer review oversight |
| People | Users | `/dashboard/admin/users` | Users (default filter: active) / Invitations |
| People | Agreements | `/dashboard/admin/agreements` | Scholarships tab + Laptops & key cards tab (`?tab=equipment`) |
| People | Diplomas | `/dashboard/admin/diplomas` | Issue / Issued / Setup (batches live under Setup) |
| Team Journey | Teams | `/dashboard/admin/teams` | Teams + strikes. Section label reads "paused" while the phase is off |
| Team Journey | Weekly Reports | `/dashboard/admin/weekly-reports` | Every submitted report |
| Team Journey | Analytics | `/dashboard/admin/analytics` | Sentiment, retention, meetings, task friction (Batch 2 retrospective) |
| System | Activity Log | `/dashboard/admin/audit-logs` | Audit log + rewards feed |
| System | Settings | `/dashboard/admin/settings` | Programme Phase switches, AI Task Reviewer |

Section labels come from `items[].section` on the Admin nav entry in
`src/components/app-sidebar.tsx`; `nav-main.tsx` renders a label whenever the
section changes.

## Overview

`src/components/admin/admin-overview.tsx` fetches `GET /api/admin/stats` once
(React Query, 30 s stale) and renders:

1. **Students** card (`HealthSnapshot` with `students` only).
2. **My Journey** block when `journeys.myJourney` is on: `AiReviewsSummary` +
   `TaskPipelineCard` for `activity_type = 'individual'`.
3. **Team Journey** block when `journeys.teamJourney` is on: team health card,
   `ProgramHealthCards`, `NeedsAttentionFeed`, `WeeklyTrendsChart`, team task
   pipeline, `AdminCharts`.
4. `PausedCard` when both are off.

## Batch scope (Team Journey pages)

Analytics, Weekly Reports and Peer Reviews carry a **Current cohort / batch**
selector (`BatchScopeSelect`, state in `?batch=` via `useBatchScope`).

- **Current cohort** (default): users and teams with `status = 'active'`.
  Archived rows never count unless asked for.
- **A batch** (e.g. Mercury-Redstone · closed): rows whose `users.batch_id` /
  `teams.batch_id` match. This is how the Batch 2 retrospective stays reachable.

Server side the scope is `p_batch_id uuid` (NULL = current) on the `_v2` RPCs
`get_analytics_{overview,teams,students,tasks,meetings,retention,strikes,economy,task_friction}_v2`,
`get_analytics_week_detail_v2(date, uuid)` and `get_admin_weekly_trends_v2`,
all built on `_admin_scope_users(uuid)` / `_admin_scope_teams(uuid)`. Routes
that filter tables directly (weekly reports, peer reviews) resolve the same
id lists with `resolveScopeIds` in `src/lib/admin/batch-scope.ts`. The
per-entity detail RPCs (team, student, report) are unchanged: they are
already scoped by id. The overview always uses the current cohort.

Users and Teams keep their own batch/status filters; Diplomas deliberately
includes archived students because graduates are archived by definition.

## Where the numbers come from

| Field on `AdminStats` | Source | Note |
|---|---|---|
| `programHealth` | `get_admin_program_health_v3()` | Student buckets count only `users.status = 'active'`. v2 counted archived Batch 2 students |
| `taskPipeline` | `get_admin_task_pipeline_v1()` | Grouped in SQL by `tasks.activity_type` + status; excludes archived users/teams. Replaces a client-side select that hit the 1000-row cap |
| `aiReview` | `get_ai_review_admin_summary_v1()` | Same numbers as the AI Reviews page header |
| `teamXp` | `get_top_teams_with_xp(10)` | |
| `weeklyTrends` | `get_admin_weekly_trends_v2(NULL)` | Current cohort only |

All five are called with the service-role client inside the route after the
admin check. New read RPCs get a new name (`_v3`, `_v1`); existing ones are
never edited in place.

## Removed on 2026-09-11 and why

- **Progress page** (`/dashboard/admin/progress`, `team-detail-modal.tsx`,
  `student-progress-alerts.tsx`): duplicated the overview health card with a
  different RPC (so the two disagreed) and the Teams / Analytics pages.
- **Laptops & Keycards page**: same component as Agreements with a different
  type filter. Route now redirects to the Equipment tab.
- **Roles & Permissions tab**, two **Download Template** buttons, the
  **AI Analysis "coming soon"** card: stubs with no implementation behind them.
- **Task Pipeline pie** (`task-status-chart.tsx`): drew the capped 1000 count.
- **Quick-link grid** on the overview: the sidebar now lists every page.
- `audit-logs/page-old.tsx` + `lib/audit-log-formatter.ts`: dead v1 copies.

Settings cards moved from the top of the overview to `/dashboard/admin/settings`.
