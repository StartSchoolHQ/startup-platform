# Admin panel

Regrouped 2026-09-24 (analytics v2). The sidebar is organised by what an
admin is doing, so AI things sit with AI things and insights with insights.
Section labels come from `src/components/admin-nav-items.ts`
(`adminNavItems(teamJourneyOn)`), rendered by `nav-main.tsx` whenever the
section changes. Tested in `tests/admin/admin-nav-items.test.ts`.

## Sections (sidebar order)

| Section | Page | Route | What it holds |
|---|---|---|---|
| — | Overview | `/dashboard/admin` | Students health, **Needs attention** (top 5 from the attention list), My Journey block, Team Journey block |
| **Insights** | Analytics | `/dashboard/admin/analytics` | This week · My Journey · Team Journey · Curriculum · Outcomes (see `admin-analytics.md`) |
| Insights | Activity Log | `/dashboard/admin/audit-logs` | One sentence per event, filter by student / kind / date (see `activity-log.md`) |
| **People** | Users | `/dashboard/admin/users` | Users (default filter: active) |
| People | Agreements | `/dashboard/admin/agreements` | Scholarships + Laptops & key cards (`?tab=equipment`) |
| People | Weekly Reports | `/dashboard/admin/weekly-reports` | Every report, team and solo — Context filter → Solo for My Journey reports |
| People | Diplomas | `/dashboard/admin/diplomas` | Issue / Issued / Setup (batches live under Setup) |
| **Curriculum** | Tasks | `/dashboard/admin/tasks` | Solo tasks / Team tasks / Suggestions |
| Curriculum | Peer Reviews | `/dashboard/admin/peer-reviews` | Team-task peer review oversight |
| **Teams** (label "· paused" while Team Journey is off) | Teams | `/dashboard/admin/teams` | Teams + strikes |
| **AI** | AI Reviews | `/dashboard/admin/ai-reviews` | AI Task Reviewer settings card + read-only audit of every automatic review |
| AI | Startie | `/dashboard/admin/startie` | Usage stats, every transcript, Startie settings card |
| **Support** | Inbox | `/dashboard/admin/inbox` | Tickets · Task suggestions · Edit suggestions (`?tab=startie` redirects to the Startie page) |
| **System** | Settings | `/dashboard/admin/settings` | Programme Phase switches · Attention rules |

## Overview

`src/components/admin/admin-overview.tsx` fetches `GET /api/admin/stats` once
(React Query, 30 s stale) and renders:

1. **Students** card (`HealthSnapshot` with `students` only).
2. **Needs attention** card (`overview/needs-attention-card.tsx`): top five of
   `get_analytics_attention_v1` for the selected batch, linking to Analytics.
3. **My Journey** block when `journeys.myJourney` is on: `AiReviewsSummary` +
   `TaskPipelineCard` for `activity_type = 'individual'`.
4. **Team Journey** block when `journeys.teamJourney` is on: team health card,
   `ProgramHealthCards`, `NeedsAttentionFeed`, `WeeklyTrendsChart`, team task
   pipeline, `AdminCharts`.
5. `PausedCard` when both are off.

## Batch scope

Overview, Analytics, Weekly Reports and Peer Reviews carry a **batch**
selector (`BatchScopeSelect`, state in `?batch=` via `useBatchScope`).

- **The open batch** (default): rows whose `users.batch_id` / `teams.batch_id`
  match the single `diploma_batches` row with `closed_at IS NULL`.
- **All active** (`?batch=current`): users and teams with `status = 'active'`.
- **A closed batch** (e.g. Mercury-Redstone): that batch's rows — the Batch 2
  retrospective.

Server side the scope is `p_batch_id uuid` (NULL = all active) on every
analytics RPC, resolved through `_admin_scope_users(uuid)` /
`_admin_scope_teams(uuid)`. Test accounts (`test\_%@test.local`) and
`[TEST]%` teams are excluded everywhere.

## Settings

- **Programme Phase** (`programme-phase-card.tsx`): My Journey / Team Journey
  switches → `platform_settings.journeys`.
- **Attention rules** (`attention-rules-card.tsx`): thresholds behind
  Analytics → This week → `platform_settings.analytics`.
- AI Task Reviewer settings moved to the AI Reviews page; Startie settings to
  the Startie page.
