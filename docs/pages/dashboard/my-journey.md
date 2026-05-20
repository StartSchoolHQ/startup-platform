## My Journey — `/dashboard/my-journey`

> A user's personal control room: individual tasks, achievement progress, weekly reports, and strikes — all keyed to their own XP and credits.

## Purpose

Most of the platform's surface (Team Journey, leaderboard, peer review) frames the user as a member of a team. This page flips the camera around: it answers "what am I, individually, accountable for and earning right now?" Founders open it to see what individual tasks are waiting for them, where they stand on achievements, and whether their weekly reflection is filed. It is the personal accountability hub that lives next to the team workspace.

## What it does

- Renders a profile header with the user's name, status badge, a "Set Status" button, and a primary CTA to **Submit Weekly Report** — disabled and re-labeled "Report Submitted" once the user has filed for the current ISO week.
- Shows four stats cards: **Total XP** and **Total Credits** (aggregated from individual-context transactions), **Tasks Completed** with completion-rate subtitle, and **Achievement Rate** (`completed / total` achievements).
- Three tabs: **Achievements**, **Weekly Reports**, **Strikes**.
- Achievements tab:
  - Grid of `AchievementCard`s with name, status (`completed` / `in-progress` / `not-started`), XP and points reward.
  - Cards are clickable filters — selecting one filters the **My Tasks** table to only that achievement's tasks; a blue banner shows the active filter with a "Show All Tasks" reset link.
  - **My Tasks** table merges `getUserTasksVisible` + `getUserIndividualTasks` (deduped by `task_id`) and shows: Task title/description, `DifficultyBadge` (Easy/Medium/Hard derived from `difficulty_level`), `StatusBadge` in `journey` variant, XP, Points, and a status-aware action button.
  - Action button states: **Start** (Not Started — fires `startTaskLazy` with optimistic cache update), **Continue** (In Progress — navigates to detail page), **Waiting** (Peer Review — disabled), **Retry** (Not Accepted), **Cooldown**, **Done** + **View Info** (Finished). Rejected tasks expand a feedback row showing `reviewer_notes`.
- Weekly Reports tab: embeds `IndividualWeeklyReportsTable` listing the user's past individual weekly reports.
- Strikes tab: a strikes table (currently fed by `myJourneyData.strikes` static data) with status badges, XP/Points penalties, and an Explain/Done action button.
- Submitting a weekly report opens `IndividualWeeklyReportModal`; on success it invalidates the entire `myJourney` query family to refresh stats and report status.

## How it looks

Top: profile header with a pink status badge and the right-aligned "Submit Weekly Report" pink CTA. Below it, a 4-column responsive grid of stats cards (collapses to 2 on md, 1 on mobile) with skeleton placeholders during initial load.

Beneath the stats sits a three-tab `Tabs` bar (Trophy / FileText / AlertTriangle icons). The default tab is **Achievements**: a 4-column achievement card grid with hover scale animation and a selected state, optional blue filter banner, then the **My Tasks** card containing a 6-column table. Each row uses a `Medal` icon, an inline title/description block, badges, and a right-aligned button cluster. Rejected tasks render a second pinned-row beneath them with the peer reviewer's feedback in a subtle `bg-primary/5` block.

The **Strikes** tab mirrors the table layout with a warning icon and red/destructive accents. The **Weekly Reports** tab renders a single component (no chrome).

## Thought behind it

Personal accountability is the lever that keeps founders moving when their team isn't. Team Journey is great for shared work, but individual progress disappears in the team view. This page exists to make individual effort visible to the person doing it — XP, credits, achievement % all framed as "yours."

The achievement-as-filter pattern is deliberate: achievements aren't passive trophies, they are clusters of tasks. Clicking one collapses the task list to "what's left to unlock this." That turns abstract progress into a concrete next action, which is what gets work done.

The weekly report CTA is intentionally loud (pink, top-right) and intentionally locks itself once submitted — the platform rewards reflection on a weekly cadence, not freeform spam, and the disabled state communicates "you're done for this week" without shaming.

Strikes get their own tab rather than inline alerts so the page doesn't feel like a punishment screen on first load. Discipline lives one click away, momentum lives front-and-center.

## Wired-up bits

- **Page file:** [`src/app/dashboard/my-journey/page.tsx`](src/app/dashboard/my-journey/page.tsx)
- **Key components:**
  - [`src/components/my-journey/achievement-card.tsx`](src/components/my-journey/achievement-card.tsx) — clickable achievement tile with status, XP, points, selected state.
  - [`src/components/dashboard/stats-card.tsx`](src/components/dashboard/stats-card.tsx) — `StatsCardComponent` for the 4 KPI cards.
  - [`src/components/ui/status-badge.tsx`](src/components/ui/status-badge.tsx) — `journey` variant badge.
  - [`src/components/ui/difficulty-badge.tsx`](src/components/ui/difficulty-badge.tsx) — Easy/Medium/Hard pill from level.
  - [`src/components/weekly-reports/individual-weekly-reports-table.tsx`](src/components/weekly-reports/individual-weekly-reports-table.tsx) — past reports list.
  - [`src/components/weekly-reports/individual-weekly-report-modal.tsx`](src/components/weekly-reports/individual-weekly-report-modal.tsx) — submit-report dialog.
- **Hooks / context:**
  - [`useAppContext`](src/contexts/app-context.tsx) — current user.
  - TanStack Query (`useQuery`, `useMutation`, `useQueryClient`) directly inside the page (no custom hook wrapper) under the `["myJourney", ...]` key family.
- **RPCs / API routes:**
  - `get_user_tasks_visible` (via [`getUserTasksVisible`](src/lib/data/tasks.ts)).
  - `get_user_individual_tasks` (via [`getUserIndividualTasks`](src/lib/data/tasks.ts)).
  - `get_user_achievement_progress` (via [`getUserAchievementProgress`](src/lib/data/achievements.ts)).
  - `getUserTaskCompletionStats` — direct `task_progress` query in [`src/lib/data/tasks.ts`](src/lib/data/tasks.ts).
  - `getIndividualXPAndCredits` — aggregates `transactions` for individual-context activities in [`src/lib/data/users.ts`](src/lib/data/users.ts).
  - `getUserProfile` — profile fetch.
  - `hasUserSubmittedThisWeekIndividual` from [`src/lib/weekly-reports.ts`](src/lib/weekly-reports.ts).
  - `startTaskLazy("individual")` from [`src/lib/tasks.ts`](src/lib/tasks.ts) — wraps the lazy progress creation + `start_individual_task` RPC.
- **Auth requirement:** authenticated. Middleware redirects unauthenticated users from `/dashboard/**` to `/login`.
- **Notable types:** `TaskTableItem` from [`src/types/team-journey.ts`](src/types/team-journey.ts), `Strike` from [`src/types/my-journey.ts`](src/types/my-journey.ts).
