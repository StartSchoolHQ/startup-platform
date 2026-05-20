# Admin Home — `/dashboard/admin`

> The mission-control overview an admin opens first thing in the morning to see whether the program is healthy this week.

## Purpose

This is the entry point for everything an admin does. It exists so a program operator can answer one question in under ten seconds: **is anything on fire right now?** Instead of forcing admins to click through users, teams, and reports separately, the home page surfaces the weekly pulse — who is engaged, who is slipping, and what concrete work is waiting for an admin decision.

Admins typically visit at the start of a work session, after a weekly check-in deadline, or when something looks off in support channels.

## What it does

- Renders a **Health Snapshot** with two side-by-side cards (Student Health, Team Health), each splitting the population into three tiers: Active / Slowing / At Risk for students, and Gaining XP / Stalling / Dormant for teams.
- Shows **week-over-week deltas** for "Active" and "At Risk" buckets so trends are visible without opening reports.
- Renders four **operational cards** for the current week: Reports This Week (with submission rate color coding), Tasks This Week, Pending Reviews, Active Strikes — each card is a clickable shortcut to the relevant admin page.
- Surfaces a **Needs Attention feed** that only appears when there is real work to do (low report submission rate, sharp drop in task velocity, unresolved strikes).
- Includes two charts: **Weekly Trends** (multi-week submissions / tasks / active students) and **Task Pipeline** status breakdown.
- Shows **team rankings** (top by points and XP) via `AdminCharts`.
- Provides a **Quick Nav** grid linking to Tasks, Users, Teams, Peer Reviews, Progress, Weekly Reports, and Audit Logs.
- All panels handle their own loading skeletons and a graceful "Try Again" error card if `/api/admin/stats` fails.

## How it looks

Top-down: a page header reading "Admin Panel", then the Health Snapshot row (two equal cards), then the four operational stat cards, then the Needs Attention feed (only when triggered), then a two-column charts row, then team rankings, then the Quick Nav link grid at the bottom. Each tier row in the snapshot, each operational card, and each Needs Attention item is an interactive surface — they are not decoration; they are routes.

Distinctive choices: tier labels use **colored dots** (emerald/amber/red) instead of full status badges to keep the cards scannable. Trend deltas invert color logic for negative-good metrics (an at-risk count going down is green). The Needs Attention feed self-suppresses when nothing is wrong, so an empty page actually means "all good".

## Thought behind it

Admins do not need a 20-tile statistics dashboard. They need to know what to act on **this week**. The recent overhaul (commits `a9f2fb4`, `4f48cd0`) split a single combined health card into separate Student Health and Team Health, because students and teams fail in different ways and are routed to different remediation flows — collapsing them lost information.

The page deliberately puts the snapshot above the operational cards: tier health is a leading indicator (who is about to fall off), while This Week counts are a trailing indicator (what already happened). Putting health first forces the eye to the predictive view.

The Needs Attention feed is opinionated by design — it does not list every metric, only the ones that crossed a threshold (report rate < 50%, task velocity dropped > 50%, strikes pending). This is the difference between a dashboard and a worklist; admins wanted the worklist.

What was deliberately left out: cumulative all-time stats, vanity metrics, and per-user drill-down. Those live on dedicated pages so the home page stays a one-screen pulse check.

## Wired-up bits

- **Page file:** [`src/app/dashboard/admin/page.tsx`](../../../src/app/dashboard/admin/page.tsx)
- **Key components:**
  - [`src/components/admin/admin-overview.tsx`](../../../src/components/admin/admin-overview.tsx) — orchestrator
  - [`src/components/admin/health-snapshot.tsx`](../../../src/components/admin/health-snapshot.tsx) — student/team tier cards
  - [`src/components/admin/program-health-cards.tsx`](../../../src/components/admin/program-health-cards.tsx) — four operational cards
  - [`src/components/admin/needs-attention-feed.tsx`](../../../src/components/admin/needs-attention-feed.tsx) — actionable worklist
  - [`src/components/admin/weekly-trends-chart.tsx`](../../../src/components/admin/weekly-trends-chart.tsx)
  - [`src/components/admin/task-status-chart.tsx`](../../../src/components/admin/task-status-chart.tsx)
  - [`src/components/admin/admin-charts.tsx`](../../../src/components/admin/admin-charts.tsx) — team rankings
  - [`src/components/ui/admin-skeleton.tsx`](../../../src/components/ui/admin-skeleton.tsx)
- **Hooks:** `useApp()` from [`src/contexts/app-context.tsx`](../../../src/contexts/app-context.tsx) for the admin role check.
- **RPCs / API routes:** `GET /api/admin/stats` ([`src/app/api/admin/stats/route.ts`](../../../src/app/api/admin/stats/route.ts)) returns aggregated user/team/task counts, weekly trends, and the v2 program-health buckets used by the snapshot. The stats route uses the admin client and re-verifies `primary_role === "admin"` server-side.
- **Auth requirement:** admin only. Non-admins are redirected to `/dashboard` from the page; the API route also returns 403.
- **Notable types or schemas:** `Stats` and `programHealth` v2 buckets defined inline in `admin-overview.tsx`. The v2 fields (`students_active`, `students_slowing`, `students_at_risk`, `teams_active`, etc.) come from a server-side health RPC and are the source of truth for the snapshot tiers.
