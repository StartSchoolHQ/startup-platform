# Student Progress — `/dashboard/admin/progress`

> The weekly health check — who's active, who's slipping, and which teams need a poke today.

## Purpose

This is the admin's Monday-morning page. It answers the only two questions that matter when you're running a cohort: who is still showing up, and who is about to fall off the rails. Rather than scattering activity data across user profiles and team pages, it consolidates a roll-up of every student and every team into a single triage view, classified into Active / Slowing / At Risk buckets so the admin can act in minutes rather than hours.

## What it does

- Loads two parallel RPC snapshots in one call — teams and individual students — and bucketises each into `green` (active, last 7 days), `yellow` (slowing, 7–13 days), and `red` (at risk, 14+ days).
- Renders a `Health Snapshot` — two side-by-side cards (Students / Teams) with three clickable rows per card; clicking any row deep-links the page to that scope and tier via URL params (`?type=students&filter=at_risk`).
- Surfaces an `At-Risk Teams` alert feed below the snapshot — generated client-side from team data with four heuristic alert types: `inactive` (7–13 or 14+ days since last activity), `zero_tasks` (no approved tasks), `no_reports` (never submitted a weekly report), `stalled` (3+ tasks in progress, <2 approved, slow). Each alert has a severity (Urgent / Warning) and a suggested action like "Schedule onboarding call".
- Two tabs — `Teams` and `Students` — with counts in the labels.
- Tier filter chips: `All`, `Active`, `Slowing`, `At Risk` — synced to the URL so snapshot deep-links and shareable URLs work.
- A `Refresh` button in the header re-runs both RPCs.
- Teams table columns: health dot, name, one-liner (truncated with tooltip), member count, total team XP / avg per member, last XP gained (red >14d, amber >7d), health badge.
- Students table columns: health dot, name/email, team, role, total XP, last login (relative), last activity (red >14d, amber >7d), health badge.
- Clicking a team row opens the `Team Detail` modal — task summary (Approved / In Progress / Pending / Not Started), per-member XP progress bars towards 8,000 XP graduation, approved-by-category badges, weekly reports submitted, and a recent activity timeline.

## How it looks

Header row: `Student Progress` title with subhead "Weekly check-in — who's active, who's slipping" and a `Refresh` button on the right.

Below: the `HealthSnapshot` 2-up grid. Each card has a title (Student Health / Team Health) with a `Users` or `Rocket` icon and a `View all →` link. Inside, three full-width buttoned rows for Active / Slowing / At Risk, each with a coloured dot, label, range hint (e.g. "7–13 days"), count, and `ArrowRight`. A footer line shows week-over-week deltas (currently zeroed in the page-level adapter).

Then the `At-Risk Teams` card with a count badge and red/yellow alert blocks — each alert has a typed icon (Clock / Target / FileText / AlertTriangle), team name, severity badge, message, and a "Suggested:" line.

Then the `Tabs` switcher with the filter chips on the right (each chip uses an emoji prefix). The active tab shows a `Card` containing the table; skeleton rows render during loading; "No teams in this bucket" empty states.

The `TeamDetailModal` opens centred at `max-w-2xl` with a scrollable body broken into four-stat task summary tiles, member XP progress bars, category coverage badges, weekly report date pills, and a left-bordered activity feed.

## Thought behind it

The product intent is triage, not analytics. Admins don't need a graph — they need a list of names to message before standup. The colour buckets and the suggested actions in the alerts panel are calibrated for that: red means "do something this week", amber means "send a check-in message". The one-week / two-week thresholds match the cadence of the weekly reports system, so a student who skipped a report and stopped earning XP shows up as Slowing or At Risk by definition.

The decision to split Students and Teams into separate snapshots (commit `a9f2fb4`) reflects a real distinction — a team can look healthy because one member is grinding while two have ghosted. Looking at students alone or teams alone hides that; showing both side by side makes it obvious. The URL-synced tier filter exists so an admin can DM a teammate "look at this list" with a link, rather than describing what they're looking at.

This page is observational. It doesn't send messages, doesn't reassign tasks, doesn't kick anyone — those are deliberately out of scope so the page stays fast and predictable. Action happens elsewhere; this page just tells you where to look.

## Wired-up bits

- **Page file:** [`src/app/dashboard/admin/progress/page.tsx`](../../../src/app/dashboard/admin/progress/page.tsx)
- **Key components:**
  - [`src/components/admin/health-snapshot.tsx`](../../../src/components/admin/health-snapshot.tsx) — 2x3 clickable health grid with WoW deltas
  - [`src/components/admin/student-progress-alerts.tsx`](../../../src/components/admin/student-progress-alerts.tsx) — heuristic alert generator and feed
  - [`src/components/admin/team-detail-modal.tsx`](../../../src/components/admin/team-detail-modal.tsx) — drill-down modal with members, categories, reports, activity
- **Hooks:** local `useState` + `useMemo` for bucket counts and alert input adapter; `useSearchParams` / `useRouter` for URL-synced filters.
- **RPCs:**
  - `get_student_progress_overview_v2` — team-level health rows
  - `get_students_health_overview_v2` — per-student health rows
  - `get_team_progress_details(p_team_id)` — fired by the team detail modal
- **Auth requirement:** admin only. Page-level redirect to `/dashboard` for non-admins.
- **Notable types:** `TeamProgress` and `StudentProgress` interfaces declared inline in the page; `Tier` (`all | active | slowing | at_risk`) and `Scope` (`students | teams`) drive URL state.
