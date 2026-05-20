# Weekly Reports — `/dashboard/admin/weekly-reports`

> Browse every weekly report ever submitted, filter by user / team / week, and read the full report in a clean modal.

## Purpose

Weekly reports are how students reflect on what they shipped, what blocked them, and what they're committing to next week. They are the single richest qualitative signal in the system — but only if someone actually reads them. This page exists so admins can browse the entire archive in one place, slice it by person / team / week, and dive into any single report without context-switching. An admin opens this when preparing 1:1s, looking for patterns across a cohort, or chasing a specific report a student referenced.

## What it does

- Lists every weekly report across all teams (admin client bypasses RLS), most recent week first, then most recent submission within the week.
- Four filters at the top of the table:
  - `User` — populated from distinct authors who have ever submitted a report.
  - `Team` — distinct teams across all reports.
  - `Week` — formatted as `Week 17 · May 5–May 11 (2025)`, sorted newest first.
  - `Status` — All / Submitted / Draft.
- A `Clear` button appears once any filter is non-default.
- Live count display: `42 reports` or `1 report` in the filter row.
- Pagination at 50 per page; only renders pagination controls when there's more than one page.
- Click any row (or the explicit `View` button) to open a read-only modal with the full report.
- Modal contents include: commitments with per-item status icons (completed / in_progress / not_done) and explanations, biggest achievement plus impact, most important outcome and key insight (rendered as quotes), measurable progress, blockers (split into "what blocked them", "analysis", and "help needed" when present), alignment-with-goals slider with score and reason, team recognition shoutouts, next week's top priority and commitments, plus a meeting count chip in the header.

## How it looks

Page header: `Weekly Reports` title above a single Card titled "All weekly reports" with the description "Browse and inspect every weekly report submitted by teams. Filter by user, team, or week, then click a row to read the full report."

Inside the card: a row of four `Select` dropdowns (User / Team / Week / Status), an optional `Clear` ghost button, and a right-aligned `42 reports` count. Below that, a bordered `Table` with columns `Week` (number + start date), `User` (name + email beneath), `Team`, `Status` (green Submitted badge / amber Draft badge), `Submitted` (formatted date), and a `View` button column. Skeleton rows render while loading. Pagination sits beneath when needed.

The view modal ([`AdminWeeklyReportViewModal`](../../../src/components/admin/admin-weekly-report-view-modal.tsx)) opens at `max-w-[760px]`. The header packs name + team badge + `Week N · YYYY` badge + optional Draft badge, then a metadata strip (week range, submitted timestamp, meeting count). The body is a stack of `Section` blocks with iconography — Target, Trophy, Sparkles, Lightbulb, TrendingUp, AlertTriangle (warning tone, amber bg), Compass (alignment with progress bar), Heart (recognition), and ArrowRight (next week). Empty fields render as `Not provided` italic placeholders.

## Thought behind it

Weekly reports are written for the future-self of the writer and for whoever runs the cohort. Without a browse-and-filter UI they rot — admins remember to read them once and then never again. This page treats the archive as a first-class observability surface: it loads fast, the filters are the ones an admin actually needs (this person, this team, this week), and the modal is structured to match the report form so reading feels familiar.

The deliberate design choice is read-only. Admins cannot edit a submitted report, cannot leave inline comments, cannot mark it as reviewed. That's intentional — the report is the student's voice; tampering with it would poison the qualitative signal. If an admin needs to follow up, they message the student directly. If they need to confirm what changed, they consult the [Activity Log](./audit-logs.md). The modal even renders draft reports unchanged, so admins can see what's in flight without the student having to "share" anything.

The recent shipping of this page (commit `bc85c54`) replaced an older approach where reports were buried inside team detail views — moving to a centralised browser was a deliberate shift towards making qualitative cohort signal as easy to scan as quantitative XP data.

## Wired-up bits

- **Page file:** [`src/app/dashboard/admin/weekly-reports/page.tsx`](../../../src/app/dashboard/admin/weekly-reports/page.tsx)
- **Key components:**
  - [`src/components/admin/admin-weekly-reports-table.tsx`](../../../src/components/admin/admin-weekly-reports-table.tsx) — filters, table, pagination
  - [`src/components/admin/admin-weekly-report-view-modal.tsx`](../../../src/components/admin/admin-weekly-report-view-modal.tsx) — read-only structured viewer
- **Hooks:** local `useState` + `useEffect`; one effect loads filter options once on mount, another refetches reports when any filter or page changes; a third resets `page` to 1 whenever a filter changes.
- **API routes:**
  - `GET /api/admin/weekly-reports` — [`src/app/api/admin/weekly-reports/route.ts`](../../../src/app/api/admin/weekly-reports/route.ts) — paginated query with `user_id`, `team_id`, `week` (`YYYY-WW`), and `status` filters. Verifies admin role with the server client, then uses the admin client to bypass RLS.
  - `GET /api/admin/weekly-reports/filters` — [`src/app/api/admin/weekly-reports/filters/route.ts`](../../../src/app/api/admin/weekly-reports/filters/route.ts) — returns distinct users, teams, and weeks derived from the `weekly_reports` table.
- **Auth requirement:** admin only. Page-level redirect; both routes return 403 for non-admins.
- **Notable types:** `AdminWeeklyReportRow` (exported by the modal) — full row including `submission_data: SubmissionData` with the structured report fields (commitments, blockers, alignmentScore, nextWeekCommitments, etc.).
