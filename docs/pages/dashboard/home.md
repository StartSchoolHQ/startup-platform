# Dashboard Home — `/dashboard`

> The post-login landing page that gives a founder their XP, points, achievements, tasks, and team standing in one glance.

## Purpose
This is the first screen a member sees after logging in. It exists to answer three questions in under five seconds: "Where do I stand?", "How is my team doing?", and "What is the most useful place to click next?". Used by every authenticated user — students, team members, and admins alike — typically several times per day during active programme weeks.

## What it does
- Greets the user by first name (pulled from `useApp()` context) with a leaderboard rank line if one exists, e.g. "Ranked #4 of 38" plus an optional weekly XP-change badge.
- Renders four KPI cards via [`StatsCardComponent`](src/components/dashboard/stats-card.tsx), each with an animated count-up, optional progress bar (parsed from `"completed/total"` strings), and click-through to a deep page:
  - XP Balance — `total_xp`, links to transaction history.
  - Points Balance — `total_points`, links to transaction history.
  - Achievements — `completed_achievements / total_achievements`, links to team journey.
  - Tasks — `completed_tasks / total_tasks`, links to team journey.
- Renders a Teams Progress card per team the user belongs to (members, tasks completed, team points, team XP). When the user is on more than one team, an aggregate row appears above with totals across all teams. Empty state offers a "Browse Teams" CTA when the user has no team yet.
- Hidden but scaffolded in code: `WhatsNextCard` (pending tasks/reviews), `IndividualWeeklyReportModal`, and the Onborda product tour. Personal Progress card exists as commented-out source for the next batch.
- Error state offers a Retry button that invalidates the entire `["dashboard"]` query branch.

## How it looks
Vertical stack inside the dashboard shell:
1. **Header block** — `h1` greeting + muted subline + optional rank link with `Trophy` icon.
2. **Stats grid** — 1-col mobile, 2-col tablet, 4-col desktop. Each card has a Framer Motion spring entry (staggered 50ms per card) and uses `lucide-react` icons coloured per metric (amber, emerald, purple, blue).
3. **Teams Progress card** — full-width ShadCN [`Card`](src/components/ui/card.tsx) with `Building2` icon and a "View Teams" outline button in the header. Inside, each team renders a 2x2 grid of [`TeamItem`](src/components/dashboard/dashboard-items.tsx) cells.
4. **Loading skeletons** mirror the final layout (no spinners) — [`StatsGridSkeleton`](src/components/ui/stats-grid-skeleton.tsx) plus tailored card skeletons.

The wider page sits inside the dashboard chrome from [`dashboard-layout-client.tsx`](src/components/dashboard-layout-client.tsx): collapsible sidebar (`AppSidebar`), top breadcrumb header, and the global `WeeklyReportBanner`.

## Thought behind it
The home page is deliberately a glance, not a workspace. Numbers are the protagonists; everything else is supporting cast. The four KPIs map directly to the platform's two currencies (XP, Points) and two completion signals (Achievements, Tasks) — that is the whole product reduced to one row, and tapping any card carries the user to where action lives. Animation is intentional: count-up makes a "0" grow into a "1,240" so progress feels earned rather than just rendered. The leaderboard rank is a soft nudge — present when motivating, invisible when not (rank 0). The page deliberately does not let you do work here: no task submission, no review queue, no editing. That keeps cognitive load low at sign-in and leaves the heavy interaction surfaces (`my-journey`, `team-journey`, `peer-review`) as their own focused destinations. The commented-out Personal Progress and weekly-report-modal blocks are kept inline rather than deleted because they are scheduled for the next cohort — code that says "we are coming back to this" is more honest than a graveyard branch.

## Wired-up bits
- **Page file:** [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx)
- **Layout:** [`src/app/dashboard/layout.tsx`](src/app/dashboard/layout.tsx) (auth gate) → [`dashboard-layout-wrapper.tsx`](src/app/dashboard/dashboard-layout-wrapper.tsx) → [`dashboard-layout-client.tsx`](src/components/dashboard-layout-client.tsx)
- **Key components:** [`StatsCardComponent`](src/components/dashboard/stats-card.tsx), [`TeamItem`/`StatItem`](src/components/dashboard/dashboard-items.tsx), [`IconContainer`](src/components/dashboard/icon-container.tsx), [`StatsGridSkeleton`](src/components/ui/stats-grid-skeleton.tsx), inline `TeamProgressCard`
- **Hooks:** [`useApp()`](src/contexts/app-context.tsx), [`useCountUp`](src/hooks/use-count-up.ts), `useQuery` / `useQueryClient` from TanStack Query
- **RPCs / API routes:** `get_dashboard_overview(p_user_id)`, `get_dashboard_action_items(p_user_id)` (both Supabase RPC, called from the browser client)
- **Auth requirement:** authenticated (layout redirects to `/login` if no session)
- **Notable types or schemas:** [`StatsCard`, `TeamProgressData`](src/types/dashboard.ts)
