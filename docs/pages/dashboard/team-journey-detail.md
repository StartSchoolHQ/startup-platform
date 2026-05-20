# Team Detail — `/dashboard/team-journey/[id]`

> The team's command center: stats, members, tasks, weekly reports,
> client meetings, and strikes for one specific product.

## Purpose

This is where the actual work of running a team happens. A team member
opens it to pick up tasks, submit the weekly report, log a client
meeting, or explain a strike. A non-member opens the same URL and gets
a read-only "View Only" view — they can browse the team's progress but
cannot act on it. Founders, co-founders, and leaders see extra controls
(Modify Team, task assignment, etc.).

## What it does

- Renders one team identified by the `id` route param: name, logo,
  description, status badge (Active/Archived), website link.
- Shows the user's relationship: **View Only** badge for non-members,
  the user's role badge (Founder, Co-Founder, Leader, Member) for
  members.
- Four stats cards at the top: **Total XP**, **Points Earned as Team**,
  **Total Clients** (from weekly reports), and **Achievements**
  (e.g. "2/4").
- Two side-by-side info cards: **Team & Experience** (size, total XP,
  collapsible member list) and **Status & Progress** (creation date,
  strikes 0–5 dots, points earned/invested, weekly-report status row).
- The weekly-report row inside Status & Progress shows a green/red dot
  per member based on whether they've submitted this week, plus a
  "Submit Team Weekly Report" button that disables once the user has
  submitted. Deadline label: "Monday 10:00 (Riga)".
- Four URL-synced tabs (`?tab=`):
  - **Tasks** (default `achievements`) — achievement cards in a 4-up
    grid that act as filters; below them, three filter selects
    (Achievement / Status / Assigned-to) and a unified [`TasksTable`](../../../src/components/team-journey/tasks-table.tsx)
    of every visible task with assign / start / open actions.
  - **Weekly Reports** — historical [`WeeklyReportsTable`](../../../src/components/team-journey/weekly-reports-table.tsx)
    grouped by week with avatar stack of submitters and aggregated
    clients/meetings counts.
  - **Client Meetings** — [`ClientMeetingsTable`](../../../src/components/team-journey/client-meetings-table.tsx)
    with an "Add Meeting" CTA for members.
  - **Strikes** — [`StrikesTable`](../../../src/components/team-journey/strikes-table.tsx)
    with an explain-strike modal.
- Tasks are **locked behind 8 client meetings**. Until the team hits
  that, achievement cards are greyed out and the table shows a "Tasks
  Locked" notice with current progress (e.g. "5/8 meetings").
- Optimistic mutations for task assignment and task starting (writes
  the cache, falls back to refetch if the server response disagrees),
  with inline success/error feedback banners that auto-dismiss.
- A manual "Refresh" button on the tasks tab with a 3-second cooldown
  countdown to discourage hammering.
- Modals: [`TeamManagementModal`](../../../src/components/team-journey/team-management-modal.tsx),
  [`WeeklyReportModal`](../../../src/components/weekly-reports/weekly-report-modal.tsx),
  [`AddClientMeetingModal`](../../../src/components/team-journey/add-client-meeting-modal.tsx),
  [`ExplainStrikeModal`](../../../src/components/team-journey/explain-strike-modal.tsx).

## How it looks

- Breadcrumb: All Teams › *Team Name*.
- Header row: square logo avatar (or pink-tinted initial), 3xl team
  name, status badge, role/View-Only badge, description, and a
  Website button (disabled if no URL). Non-members see a soft pink
  callout: "You're viewing this team as a guest."
- 4-column stats grid that collapses to 2 on tablet, 1 on mobile.
- The two-card row (Team & Experience / Status & Progress) uses a
  consistent micro-tile pattern: 8×8 monochrome icon square + label +
  value.
- Achievement cards reuse [`AchievementCard`](../../../src/components/my-journey/achievement-card.tsx)
  from my-journey. Selecting one filters the tasks table to that
  achievement's tasks; clicking again clears.
- Tasks table preserves the in-page filter chips with a "Clear filters"
  ghost button when any filter is active.

## Thought behind it

This page is the explicit team analogue of [`my-journey`](./my-journey.md):
same achievement vocabulary, same XP/points language, but every metric
is **team-level** (XP earned by team activity only, not summed user
totals). That distinction matters — it's why `getTeamStatsCombined` is
separate from individual user totals and why the page recomputes
`totalTeamXP` from team activities.

The 8-meetings gate is the platform's anti-procrastination tax: teams
can't hoard tasks for XP without first proving they're talking to real
customers. It is the reason the meeting count surfaces in three places
on the page (stats card, lock banner, achievement-card subtitles).

The View Only mode exists because the platform is intentionally
transparent across teams. Anyone can read another team's progress,
weekly reports, and strikes — but cannot submit on their behalf. This
encourages cross-team learning without breaking team ownership.

Optimistic task-state writes plus a 500 ms post-success refetch are a
deliberate trade-off: instant feedback for the common case (start /
assign), accurate state for recurring tasks where the server creates
a new `progress_id` we need to learn. The temp-id swap pattern in
`startTaskMutation.onSuccess` exists specifically to handle that.

## Wired-up bits

- **Page file:** [`src/app/dashboard/team-journey/[id]/page.tsx`](../../../src/app/dashboard/team-journey/[id]/page.tsx)
- **Key components:**
  - [`StatsCardComponent`](../../../src/components/dashboard/stats-card.tsx)
  - [`AchievementCard`](../../../src/components/my-journey/achievement-card.tsx)
  - [`TasksTable`](../../../src/components/team-journey/tasks-table.tsx)
  - [`WeeklyReportsTable`](../../../src/components/team-journey/weekly-reports-table.tsx)
  - [`ClientMeetingsTable`](../../../src/components/team-journey/client-meetings-table.tsx)
  - [`StrikesTable`](../../../src/components/team-journey/strikes-table.tsx)
  - [`TeamManagementModal`](../../../src/components/team-journey/team-management-modal.tsx)
  - [`WeeklyReportModal`](../../../src/components/weekly-reports/weekly-report-modal.tsx)
  - [`AddClientMeetingModal`](../../../src/components/team-journey/add-client-meeting-modal.tsx)
  - [`ExplainStrikeModal`](../../../src/components/team-journey/explain-strike-modal.tsx)
  - [`TeamDetailSkeleton`](../../../src/components/ui/team-detail-skeleton.tsx)
- **Hooks:** [`useAppContext`](../../../src/contexts/app-context.tsx),
  TanStack Query (`useQuery`, `useMutation`, `useQueryClient`),
  Next.js `useRouter` / `useSearchParams` / `use()` for params.
- **Data layer (from `@/lib/database`):**
  - `getTeamDetails(teamId)`
  - `isUserTeamMember(teamId, userId)`
  - `getUserTeamRole(teamId, userId)`
  - `getTeamAchievementDashboard(teamId, userId)` — returns
    achievements, tasks, `clientMeetingsCount`, `achievementsUnlocked`.
  - `getTeamStrikes(teamId)`
  - `getTeamWeeklyReports(teamId)`
  - `getTeamStatsCombined(teamId)`
  - `getTeamTasksVisible(teamId, userId)` — used in optimistic-write
    reconciliation.
- **Task action helpers:** `assignTaskToMember`, `startTask`,
  `startTaskLazy` from [`@/lib/tasks`](../../../src/lib/tasks.ts).
- **Weekly report helpers:** `hasUserSubmittedThisWeek`,
  `getCurrentWeekBoundaries` from
  [`@/lib/weekly-reports`](../../../src/lib/weekly-reports.ts).
- **API routes hit:** `POST /api/notifications/task-assigned` (fires
  on assign-to-other-user; ignored on self-assign).
- **Auth requirement:** authenticated. Member-only actions are gated
  client-side by `isUserTeamMember` and `getUserTeamRole`; security
  is enforced by RLS / RPC policies on the database side, not the UI.
- **Notable types:** [`StatsCard`](../../../src/types/dashboard.ts),
  [`TaskTableItem`](../../../src/types/team-journey.ts).
