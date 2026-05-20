# Leaderboard — `/dashboard/leaderboard`

> The public scoreboard. Live cross-cohort rankings of individuals and teams, with weekly history snapshots, rank-change indicators, and activity streaks.

## Purpose
This page is the social pressure cooker of the platform. Every founder needs a reason to ship one more thing today instead of tomorrow — the leaderboard is that reason. It exists to:

- Make progress publicly comparable, not private.
- Reward consistency (streaks) alongside raw output (XP, tasks).
- Let teams see how they stack against other teams, not just individuals.
- Give a historical record so a bad week is recoverable and a great week is preserved.

It's used by every authenticated user. They visit after submitting work to watch their rank tick up, on Mondays to see fresh weekly deltas, and casually whenever they want to know who's grinding.

## What it does
- Pre-fetches five datasets server-side in parallel and hydrates the client: live individual rankings (`get_live_leaderboard_data`), live team rankings (`get_live_team_leaderboard_data`), available individual weeks, available team weeks, and the current user's team IDs.
- Caches the route at the framework level with `export const revalidate = 60` to cut DB load on a hot page.
- **Two top-level tabs**: Individual and Teams. Switching tabs resets the week selector to "Current Week" to avoid showing a team-snapshot week on the individual tab.
- **Week selector**: a `Select` populated by ISO-week boundaries derived from `leaderboard_snapshots` (or `team_leaderboard_snapshots`). Each option shows date range and entry count, e.g. `Nov 4–Nov 10 (47 users)`. Picking "Current Week" calls the live RPC; picking a historical week calls the snapshot RPC `get_leaderboard_data` / `get_team_leaderboard_data`.
- **Individual leaderboard columns**: Rank, User, XP (with weekly change delta and `TrendingUp/Down` indicator), Tasks, Reviews (peer reviews count), Streak, Change.
- **Team leaderboard columns**: Rank, Team (with member count and `~XP/member` average), XP, Points, Tasks, Meetings, Change. Each numeric column shows weekly change.
- **Rank icons**: Crown (#1), Trophy (#2), Medal (#3), nothing for the rest, rendered by [`RankIcon`](../../../src/components/leaderboard/rank-icon.tsx).
- **Change indicator**: arrow + amount for rank movement, plus a green `NEW` badge for entries that didn't appear in the previous snapshot (`is_new_entry`).
- **Current-user / current-team highlighting**: blue tint with a subtle `pulse-subtle` animation for your row, gold gradient for #1, slate gradient for top-3.
- **Streaks**: a separate `useQuery` POSTs the visible user IDs to `/api/leaderboard/streaks`, returns activity streaks computed from `transactions` (positive `xp_change` events grouped by day, last 30 days). Streak types: `active` (>=7), `warning` (>=3), `inactive`.
- **Animated count-ups** via `useCountUp(value, 800)` make the XP / Tasks / Points / Meetings numbers tick up on render.
- **Layout-animated rows** (`framer-motion` `layout` + `AnimatePresence mode="popLayout"`) reorder smoothly when ranks shift.
- **Mobile breakpoint (<sm)**: desktop grid hides; rows render through `LeaderboardMobileRow` / `TeamLeaderboardMobileRow` cards instead.
- Empty states differentiate "current week, no activity yet" from "historical week with no snapshot — snapshots will be generated automatically".

## How it looks
Header `Leaderboard` with subtitle `Compete with others and track your progress`. Below it, a tab strip on the left (Individual / Teams) and a 200px week selector on the right; when streaks are still loading, a small skeleton dot+pill animates next to the selector.

Under the tab row, a single muted-text context line: `Live rankings — changes since last Monday` for current week, or `Snapshot from Nov 4–Nov 10` for historical weeks.

The table itself is a borderless `Card` with a 7-column CSS grid (`80px 200px 1fr 1fr 1fr 1fr 100px`). The header row is muted; data rows hover-elevate with shadow. Top-3 rows carry a faint gradient background; #1 is gold-tinted, your row is blue-tinted and gently pulses.

User cells are avatar + name + (if you) a "You" badge, with team name as subtitle. Team cells are team logo + name + (if yours) a "Your Team" badge, with `42 members · ~1,250 XP/member` as subtitle.

Streak column on Individual renders [`StreakBadge`](../../../src/components/leaderboard/streak-badge.tsx) — a coloured pill (primary tint for active, accent tint for warning, muted for inactive). Note: the badge labels read "weeks" in the component but the underlying data is `days`; this is a known mismatch worth flagging.

The Change column shows either a green `NEW` badge or [`ChangeIndicator`](../../../src/components/leaderboard/change-indicator.tsx) with up/down/none direction and the absolute amount of rank movement.

On mobile, the same data folds into stacked cards via `LeaderboardMobileRow` / `TeamLeaderboardMobileRow`.

## Thought behind it
The leaderboard is the most opinionated piece of psychology in the product. The team isn't trying to crown a winner — they're trying to make showing up tomorrow feel slightly inevitable. Three deliberate tradeoffs make that work:

**Live rankings as default, snapshots as memory.** Most leaderboards either nuke history weekly (no continuity) or only show all-time totals (no urgency). This one does both: live RPC for "right now" and weekly snapshots for "what happened then". You can lose a week and recover. You can't pretend a week didn't happen.

**Streaks measured in days, not weeks.** A 3-day warning threshold and 7-day active threshold are aggressive. The platform is implicitly saying *consistency at the daily granularity is the metric we care about*, not heroic Sunday catch-ups. The mismatched "weeks" label in the badge UI is a bug that softens that message — worth fixing.

**Teams ranked separately and by total, not by average.** The team tab reinforces a different kind of pressure: collective output. Showing `~XP/member` as a subtitle (not as the rank metric) is a quiet warning to free-riders without punishing big teams in the rankings. A 6-person team that ships hard still wins.

**Rank-change indicators over absolute rank.** The +/- arrow tells you whether you're trending. A user at rank 23 who climbed 5 spots feels better than rank 18 who fell 5, even though 18 > 23. Movement is the dopamine, not the position.

**Current-user pulse.** That subtle blue pulse on your own row is the smallest possible signal that says "you exist on this list" — it makes the page feel personal even when you're rank 47 of 50.

## Wired-up bits
- **Page file (server):** [`src/app/dashboard/leaderboard/page.tsx`](../../../src/app/dashboard/leaderboard/page.tsx) — runs server-side fetches, has `export const revalidate = 60`
- **Page client:** [`src/app/dashboard/leaderboard/page-client.tsx`](../../../src/app/dashboard/leaderboard/page-client.tsx)
- **Key components:**
  - [`src/components/leaderboard/rank-icon.tsx`](../../../src/components/leaderboard/rank-icon.tsx) — crown/trophy/medal
  - [`src/components/leaderboard/change-indicator.tsx`](../../../src/components/leaderboard/change-indicator.tsx) — rank delta arrow
  - [`src/components/leaderboard/streak-badge.tsx`](../../../src/components/leaderboard/streak-badge.tsx) — coloured streak pill
  - [`src/components/leaderboard/leaderboard-skeleton.tsx`](../../../src/components/leaderboard/leaderboard-skeleton.tsx)
  - [`src/components/leaderboard/leaderboard-mobile-rows.tsx`](../../../src/components/leaderboard/leaderboard-mobile-rows.tsx) — mobile card layout for individual + team
- **Hooks:**
  - [`src/hooks/use-count-up.ts`](../../../src/hooks/use-count-up.ts) — animated number increment
- **Server helpers:** [`src/lib/leaderboard-server.ts`](../../../src/lib/leaderboard-server.ts) — `getServerSideLiveLeaderboardData`, `getServerSideAvailableWeeks`, `getServerSideLiveTeamLeaderboardData`, `getServerSideTeamAvailableWeeks`, `getServerSideUserTeamIds`, plus streak calculators
- **Week math:** [`src/lib/week-utils.ts`](../../../src/lib/week-utils.ts) → `getISOWeekBoundaries`
- **RPCs:**
  - `get_live_leaderboard_data(p_limit)` — current-week individual rankings
  - `get_live_team_leaderboard_data(p_limit)` — current-week team rankings
  - `get_leaderboard_data(p_limit, p_week_number, p_week_year)` — historical individual snapshot
  - `get_team_leaderboard_data(p_limit, p_week_number, p_week_year)` — historical team snapshot
  - Direct selects on `leaderboard_snapshots` and `team_leaderboard_snapshots` to populate the week selector
- **API routes:** `POST /api/leaderboard/streaks` — batch streak lookup ([`src/app/api/leaderboard/streaks/route.ts`](../../../src/app/api/leaderboard/streaks/route.ts))
- **Auth requirement:** Authenticated. The page reads `user.id` from `supabase.auth.getUser()` server-side to compute `userTeamIds` and highlight the current row, but ranking data is visible to any authenticated user.
- **Notable types or schemas:** [`src/types/leaderboard.ts`](../../../src/types/leaderboard.ts) → `LeaderboardEntry`, `TeamLeaderboardEntry`. DB-shape variants exported from `leaderboard-server.ts`. Streak shape: `{ days: number; type: "active" | "warning" | "inactive" }`.
