# Admin Analytics Page — Design Spec

**Date:** 2026-07-14
**Branch:** `feature/admin-analytics`
**Status:** Approved by admin (design review in session)

## Goal

A new admin page that turns 28 weeks of weekly-report data (1,013 submitted
reports, 67 students, 40 teams) and task-progress data (1,764 rows) into an
easy-to-read visual overview: how students and teams felt over time, why
(their own written reasons), participation, commitment follow-through, and
task completion.

## Decisions made

- **Analysis text:** students' own words (`alignmentReason`, `blockers`)
  shown on drill-down. AI-generated summaries deferred — UI reserves a
  visible "AI Analysis — coming soon" placeholder card so the slot exists.
- **Structure:** single route `dashboard/admin/analytics` with 4 tabs
  (Overview / Teams / Students / Tasks). Each tab has one focused view,
  one API route, one consolidated RPC.
- **No AI pipeline, no cron, no Anthropic key** in this iteration.

## Data source facts (verified via Supabase MCP, 2026-07-14)

- `weekly_reports`: all submitted rows have `submission_data.alignmentScore`
  (int 1–10), `alignmentReason`, `blockers`, `commitments[]`
  (`status`: completed | in_progress | not_done), `meetingsHeld` (dirty —
  sometimes text, must guard casts), `nextWeekCommitments`. `context` is
  always `'team'`; the reporter is `user_id`, aggregate by `team_id`.
- Weeks run 2025-12-29 → today, keyed by `week_start_date`.
- `task_progress.status`: approved (1003), not_started (393),
  in_progress (332), rejected (32), pending_review (4). Join `tasks` for
  titles. `points_awarded` is often NULL — don't rely on it.

## Database layer — 6 new read-only RPCs

All `SECURITY DEFINER` with an internal admin guard
(`auth.uid()` must map to `users.primary_role = 'admin'`, else raise).
Purely additive — no existing objects are modified (no V2 pattern needed).
Numeric casts on jsonb fields guarded with regex checks
(`submission_data->>'alignmentScore' ~ '^[0-9]+$'`).

1. `get_analytics_overview()` — one row per week: reports, avg/min/max
   score, low (≤4) / high (≥8) counts, real-blocker count (trimmed text
   length > 5 and not in none/no/n-a set), commitment completion %,
   distinct active teams, expected reporter count (active students) for
   participation %.
2. `get_analytics_teams()` — one row per team per week: team id/name,
   avg score, reports, members reporting.
3. `get_analytics_team_detail(p_team_id uuid)` — one row per member per
   week: user id/name, score, alignmentReason, blockers, submitted_at.
4. `get_analytics_students()` — one row per student: id, name, team name,
   latest score, overall avg, avg of last 4 weeks vs previous 4 (trend),
   weeks submitted, weeks since first report (for missed-weeks calc),
   last submission date.
5. `get_analytics_student_detail(p_user_id uuid)` — full weekly timeline:
   week, score, alignmentReason, blockers, biggestAchievement.
6. `get_analytics_tasks()` — jsonb with three keys: `top_tasks`
   (top 15 by approved count: title, completions), `status_funnel`
   (count per status), `weekly_completions` (approved per week by
   `completed_at`).

## API routes

`src/app/api/admin/analytics/{overview|teams|team-detail|students|student-detail|tasks}/route.ts`
following `.claude/rules/api-routes.md`: server client → `getUser()` → 401,
verify `primary_role === 'admin'` from `users` → 403, call RPC with the
user-scoped server client, wrap errors, never leak raw DB errors.
Detail routes validate `teamId` / `userId` query param as UUID (Zod).

## UI

`src/app/dashboard/admin/analytics/page.tsx` — client component, admin
guard identical to `admin/weekly-reports/page.tsx`, ShadCN `Tabs`.
Tab components live in `src/components/admin/analytics/`, each < 200 lines,
React Query per tab with `enabled` on active tab + `staleTime: 5 min`.

- **Overview:** 4 KPI cards (avg sentiment + Δ vs prev week,
  participation %, commitment follow-through %, weeks with real blockers);
  ComposedChart — sentiment line + min–max band + participation bars
  (current incomplete week excluded, mirroring `weekly-trends-chart.tsx`);
  clicking a week opens a Sheet with that week's low scorers and their
  verbatim reasons/blockers; muted "AI Analysis — coming soon" card.
- **Teams:** grid of 40 sparkline cards sorted worst-trend-first with
  current avg + trend arrow; click → Dialog: full team chart with
  per-member lines + week-by-week quote feed (+ AI placeholder).
- **Students:** sortable/searchable table (name, team, latest, avg,
  sparkline, weeks missed), low current scores highlighted;
  click → Dialog with personal timeline + quotes.
- **Tasks:** horizontal bar chart top 15 completed tasks, status funnel,
  completions-over-time area chart.

Charts: Recharts 3.6 (already installed), tooltip style copied from
`admin/weekly-trends-chart.tsx`.

## Errors / loading / testing

- Skeletons on first load per tab; `toast.error` + retry button on failure.
- One vitest file exercising the 6 RPCs with the admin client, asserting
  row shape and sane aggregate bounds (scores within 1–10, percentages
  0–100). Read-only, safe against prod data.

## Out of scope

AI summary generation (placeholder only), report content editing,
individual-context reports (none exist), exports.
