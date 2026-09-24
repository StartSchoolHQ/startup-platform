# Admin analytics (v2)

> `/dashboard/admin/analytics` answers three questions for whoever runs the programme: **who needs attention this week**, **how is the cohort progressing** (My Journey and Team Journey), and **which tasks are broken**. Plus an Outcomes tab for the cohort report. Built 2026-09-24; spec in `docs/internal/superpowers/specs/2026-09-24-admin-analytics-v2-design.md`.

Every tab is scoped by the batch selector. Programme week = weeks since the batch's admission date, so Batch 2 and Batch 3 line up.

## Tabs

| Tab | Shows | RPC(s) |
|---|---|---|
| **This week** (default) | Pulse: active students, need attention, completions, sentiment (with deltas). **Attention list** ranked by severity with reasons and a Dismiss button. **What moved**: first approvals, phase completions, sentiment jumps, new revenue. | `get_analytics_pulse_v1`, `get_analytics_attention_v1`, `analytics_dismiss_v1` |
| **My Journey** | Phase funnel, cohort pace (median phase per week + student dots), weekly activity / completions / solo sentiment, students table | `get_analytics_my_journey_v1` |
| **Team Journey** | Sentiment & participation (existing), milestones (customer conversations per week, revenue per team), teams grid, students in teams, meetings detail, strikes and points | `get_analytics_overview_v2` (via API), `get_analytics_milestones_v1`, existing v2 readers |
| **Curriculum** | Per task: started, approved, first-pass %, attempts, median hours, rejections, stale; click a row for the reviewer's reasons | `get_analytics_review_quality_v1` |
| **Outcomes** | Totals, batch-vs-batch on programme week (metric + comparison batch selectable), retention / departures / accountability (existing) | `get_analytics_outcomes_v1`, `get_analytics_retention_v2` etc. |

## Attention rules

Thresholds live in `platform_settings.analytics` (Settings → Attention rules), read by `_analytics_settings_v1()`:

| Rule | Default | Reason text |
|---|---|---|
| Inactive | 7 days | "No activity for N days" / "No activity recorded yet" |
| Stuck | 10 days in progress, nothing submitted | "Stuck on “task” for N days" |
| Repeated rejections | 3 on one task (AI or peer) | "“task” rejected N times" |
| Low sentiment | latest score ≤ 5 | "Sentiment N: “reason…”" |
| Missed reports | 2 consecutive expected weeks | "No weekly report for N weeks" |
| Behind cohort | ≥ 1 phase below the median | "N phase(s) behind the cohort" |
| Open strike | any `team_strikes.status = 'active'` | "Unresolved strike since DD Mon" |

Severity = number of reasons, +1 when inactive. **Activity** = task start/submit/complete, weekly report, Startie message, client meeting, or sign-in (`auth.users.last_sign_in_at`).

**Dismiss** (`analytics_dismiss_v1`) hides a student for `dismiss_days`, stores the note in `analytics_dismissals`, and shows in the Activity Log as `attention_dismissed`.

## Metric definitions

- **Active student (week)**: any activity event in that week. Weekly active % = active ÷ active-status students in scope.
- **Highest phase**: max gated phase where `my_journey_phase_unlocked_v1` is true (1 when none).
- **Pace**: median of "phase reached by week end" across students; a phase counts as reached once ≥50% of the previous phase's gated tasks were approved by then.
- **First-pass rate**: solo = attempt-1 approvals ÷ progress rows with any AI decision; team = approved with no rejected `review_completed` event ÷ reviewed.
- **Median hours**: `completed_at − started_at` for approved rows.
- **Participation (overview v3)**: reports ÷ expected, where expected = team members that week + solo students without a team that week while My Journey is on. Solo reports become team reports the week a student joins a team; the sentiment line is continuous.
- **Outcomes**: per programme week, active %, cumulative completions, My Journey completion %, reports, sentiment; totals: students, still active, meetings, MRR (open `revenue_streams`), reports.

## Code

- SQL: `supabase/migrations/20260924114238_admin_analytics_v2_v1.sql` (helpers `_analytics_*_v1`, readers, `analytics_dismissals`, `get_admin_activity_v1` branch).
- Client helpers: `src/lib/analytics/{settings,week,attention,compare}.ts`.
- Hooks: `src/components/admin/analytics/use-analytics.ts` (v2 readers call the RPCs directly with the browser client), `src/hooks/use-analytics-settings.ts`.
- Tabs: `src/components/admin/analytics/{this-week,my-journey,team-journey,curriculum,outcomes}/`.
- Tests: `tests/admin/analytics-v2-rpcs.test.ts` (DB, cleanup), `analytics-{settings,week,attention,compare}.test.ts`, `attention-row.test.tsx`, `phase-funnel.test.tsx`, `admin-nav-items.test.ts`.

## Known limits

- Cohort median is meaningless below ~5 students; the pace chart still draws, the Behind-cohort rule simply never fires.
- `get_analytics_tasks_v2` and `get_analytics_task_friction_v2` are no longer called (absorbed by Curriculum) but still exist in the database.
- `p_include_test` on three readers exists for the DB tests only; the UI never passes it.

## Rollback

Revert the app code (git). Then drop the functions listed in the migration's grant block, `drop table public.analytics_dismissals`, `delete from platform_settings where key = 'analytics'`, and re-create `get_admin_activity_v1` from migration `admin_activity_feed_v1` (without the dismissal branch).
