# Leaderboard System

> The leaderboard ranks students and teams within each economy — My Journey XP / My Journey Credits and Team XP / Team Points — alongside achievements, tasks completed, and meetings held. It uses a weekly snapshot system to track progress over time and display week-over-week changes.

## Overview

The leaderboard is a core gamification feature of the StartSchool Platform. It serves two purposes:

1. **Competition** — users and teams can see how they rank against each other
2. **Progress tracking** — week-over-week change indicators show whether a user or team is moving up, down, or holding steady

The leaderboard lives at `/dashboard/leaderboard`. Since the two-economies
split (2026-08-28) it is organised by programme phase rather than by
"individual vs team":

- **My Journey** — students ranked by My Journey XP, with My Journey Credits
  and individual tasks completed. Live data only, no week selector.
- **Team Journey** — sub-tabs **Teams** and **Members**, both ranked by the
  Team economy (Team XP, tiebreak Team Points), both with the week selector
  that lists all weeks with available snapshot data.

Each board renders only when its journey is enabled in `platform_settings`
(see `docs/documentation/economies.md`); admins always see both, and when
only one journey is on the top-level tabs disappear and just that board's
title is shown. The old combined-XP "Individual" tab is gone.

---

## Architecture

### Data Flow

```
User Actions (tasks, meetings, reviews)
  → transactions table (XP/points recorded)
    → Weekly Cron Job (generate snapshots)
      → leaderboard_snapshots / team_leaderboard_snapshots
        → RPC functions (get_leaderboard_data, get_team_leaderboard_data)
          → Server Component (ISR 60s) → Client Component (React Query)
            → UI (tabs, week selector, animated rankings)
```

### Server/Client Split

| Layer | File | Role |
|-------|------|------|
| Server Page | `src/app/dashboard/leaderboard/page.tsx` | ISR with 60s revalidation, fetches initial data |
| Client Page | `src/app/dashboard/leaderboard/page-client.tsx` | React Query orchestration, tabs, week selector |
| Server Functions | `src/lib/leaderboard-server.ts` | RPC wrappers, streak calculation |
| Client Functions | `src/lib/data/leaderboard.ts` | Browser-based RPC clients |
| Error Boundary | `src/app/dashboard/leaderboard/error.tsx` | Catch/display errors with retry |

---

## Database Schema

### `leaderboard_snapshots` (Individual Weekly Snapshots)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `users` |
| `week_number` | INT | ISO week number |
| `week_year` | INT | ISO year |
| `total_xp` | INT | Aggregated XP at snapshot time |
| `total_points` | INT | Aggregated points at snapshot time |
| `achievements_count` | INT | Total achievements unlocked |
| `tasks_completed` | INT | Total tasks completed |
| `rank_position` | INT | Calculated rank based on `total_xp` |
| `created_at` | TIMESTAMP | Snapshot generation time |

**Indexes:** `(week_year, week_number, rank_position)` for efficient lookups.

### `team_leaderboard_snapshots` (Team Weekly Snapshots)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `team_id` | UUID | FK to `teams` |
| `week_number` | INT | ISO week number |
| `week_year` | INT | ISO year |
| `total_xp` | INT | Sum of all active members' XP |
| `total_points` | INT | Sum of all active members' points |
| `tasks_completed` | INT | Team task completions |
| `meetings_count` | INT | Completed client meetings |
| `member_count` | INT | Active members at snapshot time |
| `rank_position` | INT | Calculated rank |
| `created_at` | TIMESTAMP | Snapshot generation time |

### `transactions` (All Point/XP Changes)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `users` |
| `team_id` | UUID | FK to `teams` (nullable) |
| `type` | `transaction_type` | See transaction types below |
| `activity_type` | TEXT | Activity category |
| `points_change` | INT | Points delta (positive or negative) |
| `xp_change` | INT | XP delta |
| `points_type` | TEXT | "individual" or "team" |
| `task_id` | UUID | FK to `tasks` (nullable) |
| `achievement_id` | UUID | FK to `achievements` (nullable) |
| `revenue_stream_id` | UUID | FK to `revenue_streams` (nullable) |
| `validated_by_user_id` | UUID | FK to `users` (nullable) |
| `week_number` | INT | Week of transaction |
| `week_year` | INT | Year of transaction |
| `metadata` | JSONB | Additional data |
| `description` | TEXT | Human-readable description |
| `created_at` | TIMESTAMP | Transaction time |

---

## Point System

### XP vs Points

XP is the primary ranking metric (cannot be spent); points are a
currency-like balance that can go up or down (team costs, penalties) and
act as the tiebreaker. Each economy has its own pair, and students are
never shown a bare "XP" or "Points" — labels come from
`src/lib/economy-labels.ts`.

| Board                     | XP column        | Points column | Stored on `users`                     |
| ------------------------- | ---------------- | ------------- | ------------------------------------- |
| My Journey                | "My Journey XP"  | "My Journey Credits" | `my_journey_xp`, `my_journey_credits` |
| Team Journey — Teams      | "Team XP"        | "Team Points" | summed from members' `team_xp` / `team_points` |
| Team Journey — Members    | "Team XP"        | "Team Points" | `team_xp`, `team_points`              |

Which economy a transaction lands in is decided by
`transactions.activity_type` (`'individual'` → My Journey, anything else →
Team), applied by the `trg_transactions_split_economy` trigger.
`users.total_xp` / `total_points` remain as the legacy combined wallet and
are no longer used for any student-facing ranking.

### Transaction Types

| Type | Trigger | Points | XP | Direction |
|------|---------|--------|----|-----------|
| `task` | Task completion & approval | `base_points_reward` | `base_xp_reward` | Positive |
| `achievement` | Achievement criteria met | `achievement.points_reward` | `achievement.xp_reward` | Positive |
| `meeting` | Client meeting completed | 25 | 50 | Positive |
| `revenue` | Revenue stream validated by admin | From metadata | From metadata | Positive |
| `validation` | Admin manually awards points | Admin-set | Admin-set | Positive |
| `team_cost` | Team formation/maintenance | Negative | 0 | Negative |
| `weekly_report_penalty` | Missed weekly report deadline | Negative | Negative | Negative |
| `weekly_report_refund` | Penalty reversed after explanation | Positive | Positive | Positive |

### Points Calculation

```sql
User Total XP = SUM(transactions.xp_change) WHERE user_id = ?
User Total Points = SUM(transactions.points_change) WHERE user_id = ?
```

---

## Ranking Logic

### Ranking Rules

- **Primary Sort:** `total_xp DESC`
- **Tiebreaker:** `total_points DESC` (implicit in database ordering)

### Rank Icons

| Rank | Icon | Visual |
|------|------|--------|
| #1 | Crown | Gold gradient background |
| #2 | Trophy | Slate gradient background |
| #3 | Medal | Slate gradient background |
| #4+ | Number | Standard row |

### RPC Functions

#### `get_leaderboard_data(p_limit, p_week_number, p_week_year)`

Fetches individual leaderboard with week-over-week change indicators.

**Returns:**
```
user_id, user_name, user_email, user_avatar_url,
total_xp, total_points, achievements_count, tasks_completed, team_name,
rank_position, xp_change, points_change, achievements_change,
tasks_change, rank_change
```

**Logic:**
1. If no week specified, use current Riga week via `get_riga_week_boundaries()`
2. Fetch all users + current totals
3. Fetch previous week's snapshot for deltas
4. Calculate change between weeks
5. Rank by `total_xp` descending
6. Return top N with all metrics

#### `get_team_leaderboard_data(p_limit, p_week_number, p_week_year)`

Same pattern for teams. Returns:
```
team_id, team_name, team_logo_url,
total_xp, total_points, tasks_completed, meetings_count, member_count,
rank_position, xp_change, points_change, tasks_change,
meetings_change, rank_change
```

#### `get_live_my_journey_leaderboard_v1(p_limit default 50)`

Live My Journey board. Returns:

```
rank_position, user_id, user_name, user_avatar_url,
my_journey_xp, my_journey_credits, tasks_completed
```

Filters `status = 'active'`, `primary_role = 'user'`, confirmed email.
There is no snapshot equivalent — this board has no week selector.

#### `get_live_team_members_leaderboard_v1(p_limit default 50)`

Live Team Journey → Members board. Same shape as `get_live_leaderboard_data`
with `total_xp := team_xp` and `total_points := team_points`. Historical
weeks still come from `get_leaderboard_data` (snapshots).

#### `generate_weekly_leaderboard_snapshots(p_week_number, p_week_year)`

Creates individual snapshots for all active users.

**Returns:** `{ success, message, usersProcessed }`

#### `generate_weekly_leaderboard_snapshots_v2(p_week_number, p_week_year)`

Same body with `total_xp := team_xp` and `total_points := team_points`.
**This is what cron jobs 3 and 6 run** since 2026-08-28. Snapshot column
names are unchanged; rows written from that date hold Team economy values,
earlier rows hold the combined wallet (Batch 2 individual XP was ~0, so the
history reads the same).

#### `generate_weekly_team_leaderboard_snapshots(p_week_number, p_week_year)`

Creates team snapshots for all active teams.

**Returns:** `{ success, teamsProcessed }`

#### `get_riga_week_boundaries()`

Returns current week start/end in Riga timezone (UTC+2).

**Returns:** `{ week_start, week_end, week_number, week_year }`

---

## Frontend Components

### Component Map

| Component | File | Purpose |
|-----------|------|---------|
| `RankIcon` | `src/components/leaderboard/rank-icon.tsx` | Crown/trophy/medal/number display |
| `ChangeIndicator` | `src/components/leaderboard/change-indicator.tsx` | Up/down/same arrows with color |
| `StreakBadge` | `src/components/leaderboard/streak-badge.tsx` | Activity streak with color coding |
| `LeaderboardSkeleton` | `src/components/leaderboard/leaderboard-skeleton.tsx` | Loading state skeleton |

### Inline Row Components

| Component | Purpose |
|-----------|---------|
| `IndividualRow` | Single user row with rank, name, XP, points, achievements, tasks, streak, change |
| `TeamRow` | Team row with rank, name, XP, points, tasks, meetings, member count, change |

### Change Indicator

- **Up:** Green arrow + number of positions gained
- **Down:** Red arrow + number of positions lost
- **Same:** Dash (—)

### Streak Badge

| Status | Days | Visual |
|--------|------|--------|
| Active | 7+ | Primary color background |
| Warning | 3–6 | Accent color background |
| Inactive | 0–2 | Muted background |

---

## Hooks & Data Fetching

### Server-Side Initial Load (`page.tsx`)

```typescript
export const revalidate = 60; // ISR: 60-second cache

const [
  initialLeaderboardData,      // get_leaderboard_data RPC
  availableWeeks,               // Distinct weeks from leaderboard_snapshots
  initialTeamData,              // get_team_leaderboard_data RPC
  teamAvailableWeeks,           // Distinct weeks from team_leaderboard_snapshots
  userTeamIds,                  // User's active team memberships
] = await Promise.all([...]);
```

### Client-Side React Query (`page-client.tsx`)

| Query Key | Purpose | Trigger |
|-----------|---------|---------|
| `["leaderboard", "availableWeeks"]` | Individual week list | Mount |
| `["leaderboard", "teamAvailableWeeks"]` | Team week list | Mount |
| `["leaderboard", "data", selectedWeek]` | Individual rankings | Week change |
| `["leaderboard", "teams", selectedWeek]` | Team rankings | Week change |
| `["leaderboard", "streaks", userIds]` | User streaks batch | Data loaded |

### `useCountUp` Hook

**File:** `src/hooks/use-count-up.ts`

Animates numbers from 0 to target value with ease-out cubic easing.

- **Duration:** 800ms default
- **Easing:** Fast start, slow end
- **Used for:** XP, Points, Achievements, Tasks count columns

---

## Filtering & Views

### Tab Switching

| Tab | Data Source | Columns |
|-----|------------|---------|
| My Journey | `get_live_my_journey_leaderboard_v1` RPC | Rank, Student, My Journey XP, My Journey Credits, Tasks done |
| Team Journey → Teams | `get_team_leaderboard_data` RPC | Rank, Team, Team XP, Team Points, Tasks, Meetings, Change |
| Team Journey → Members | `get_live_team_members_leaderboard_v1` (current) / `get_leaderboard_data` (past weeks) | Rank, Student, Team XP, Tasks, Reviews, Streak, Change |

### Week Selector

- Dropdown lists all weeks with available snapshot data
- "Current" option shows live data (no snapshot needed)
- Switching weeks triggers new React Query fetch
- Initial data used only for "current" week (ISR optimization)

### Current User Highlighting

- Current user's row has blue pulsing background
- Current user's team rows highlighted when on Teams tab

---

## Gamification Elements

### Activity Streaks

**Calculation Logic** (`src/lib/leaderboard-server.ts`):

1. Fetch last 30 days of transactions where `xp_change > 0`
2. Group by date (ISO date extraction)
3. Count consecutive days backward from today
4. Allow today (index 0) to be inactive without breaking streak
5. Return `{ days: number, type: "active" | "warning" | "inactive" }`

**API Endpoint:** `POST /api/leaderboard/streaks`
- Body: `{ userIds: string[] }`
- Returns: `{ streaks: { [userId]: { days, type } } }`
- Batch fetch for efficiency

### Top 3 Visual Treatment

- **#1:** Yellow gradient background (`from-yellow-50/50`)
- **#2–3:** Slate gradient background (`from-slate-50/50`)
- **Shadow:** Elevated shadow for top 3 rows

### Animated Numbers

All numeric values animate from 0 to target on data load via `useCountUp` hook.

---

## API Routes

### `POST /api/leaderboard/generate-snapshots`

**Auth:** Bearer token via `CRON_SECRET_KEY` environment variable.

**Body:** `{ weekNumber?: number, weekYear?: number }`

**Logic:**
```typescript
await Promise.all([
  generateServerSideWeeklySnapshots(weekNumber, weekYear),
  generateServerSideWeeklyTeamSnapshots(weekNumber, weekYear),
]);
```

**Schedule:** Typically weekly (e.g., Sundays 23:00 Riga time) via external cron.

### `POST /api/leaderboard/streaks`

**Auth:** Authenticated user.

**Body:** `{ userIds: string[] }`

**Returns:** `{ streaks: { [userId]: { days: number, type: string } } }`

---

## Data Conversion Layer

### DB Types vs UI Types

The system maintains separate type definitions for database and UI layers:

**DB Type** (`src/lib/leaderboard-server.ts`):
```typescript
interface LeaderboardEntry {
  user_id, user_name, user_email, user_avatar_url,
  total_xp, total_points, achievements_count, tasks_completed,
  team_name, rank_position, xp_change, points_change,
  achievements_change, tasks_change, rank_change
}
```

**UI Type** (`src/types/leaderboard.ts`):
```typescript
interface LeaderboardEntry {
  rank: number;
  user: { name, avatar, teams, isCurrentUser? };
  xp: { current, change };
  points: { current, change };
  achievements: { current, change };
  tasks: { current, change };
  streak: { days, type };
  change: { direction, amount };
  rankIcon?: "crown" | "trophy" | "medal" | "flame" | "none";
}
```

**Conversion:** `convertToLeaderboardEntry()` maps DB → UI, assigning rank icons, calculating change direction, and attaching streak data.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No snapshot data for week | "No leaderboard data available for this week" |
| User not in team | Displays "No Team" |
| Zero streak | "0 days" with inactive badge |
| Rank tie | Secondary sort by `total_points` |
| Missing weeks | Week selector skips them (`user_count = 0`) |
| Server error | Error boundary with "Try Again" button |

---

## Performance

| Optimization | Detail |
|-------------|--------|
| ISR | Server page cached for 60 seconds, reduces DB load ~96% |
| Batch streak fetch | Single POST for all user streaks (not N+1) |
| Pre-aggregated snapshots | Weekly snapshots avoid real-time aggregation |
| RPC functions | Server-side aggregation, not client-side joins |
| React Query dedup | Identical requests deduplicated automatically |
| Animated numbers | `useCountUp` runs in requestAnimationFrame |

---

## File Reference

| File | Role |
|------|------|
| `src/app/dashboard/leaderboard/page.tsx` | Server component, ISR entry |
| `src/app/dashboard/leaderboard/page-client.tsx` | Client component, full UI |
| `src/app/dashboard/leaderboard/error.tsx` | Error boundary |
| `src/components/leaderboard/my-journey-board.tsx` | My Journey board (live only) |
| `src/components/leaderboard/team-journey-board.tsx` | Team Journey shell with Teams / Members sub-tabs |
| `src/components/leaderboard/teams-board.tsx` | Teams board |
| `src/components/leaderboard/members-board.tsx` | Members board (Team economy) |
| `src/components/leaderboard/leaderboard-board-shell.tsx` | Shared board frame: card, desktop header grid, loading/data/empty states, mobile card mirror. The title and week selector live in `team-journey-board.tsx`. |
| `src/components/leaderboard/member-row.tsx`, `team-row.tsx`, `row-styles.ts`, `mappers.ts` | Shared row rendering + DB→UI mapping |
| `src/components/leaderboard/rank-icon.tsx` | Rank position icons |
| `src/components/leaderboard/change-indicator.tsx` | Week-over-week arrows |
| `src/components/leaderboard/streak-badge.tsx` | Activity streak display |
| `src/components/leaderboard/leaderboard-skeleton.tsx` | Loading skeleton |
| `src/lib/leaderboard-server.ts` | Server-side RPC wrappers + streak calc |
| `src/lib/data/leaderboard.ts` | Client-side RPC wrappers |
| `src/app/api/leaderboard/generate-snapshots/route.ts` | Cron endpoint for snapshots |
| `src/app/api/leaderboard/streaks/route.ts` | Batch streak fetch endpoint |
| `src/types/leaderboard.ts` | UI type definitions |
| `src/hooks/use-count-up.ts` | Number animation hook |
| `src/data/leaderboard-data.ts` | Mock/template data |
