# Transactions & Points Economy

> The transactions system is the central economic ledger of the StartSchool Platform. Every point gain, XP award, penalty, and refund is recorded as an immutable transaction. User totals are maintained atomically via RPC functions, and the transaction history serves as the audit trail for all economic activity.

## Overview

The economy has two currencies:

- **XP (Experience Points)** — Represents overall progress. Primary ranking metric. Cannot be spent or lost (except penalties).
- **Points (Credits)** — Currency-like balance. Can increase (rewards) or decrease (team costs, penalties).

All economic events are recorded in the `transactions` table. User totals (`users.total_xp`, `users.total_points`) are maintained atomically by database RPC functions — they are NOT recalculated from transactions on each read.

---

## Database Schema

### `transactions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `users.id` — who earned/lost |
| `type` | `transaction_type` | Transaction category (see types below) |
| `xp_change` | INT | XP delta (positive or negative, default 0) |
| `points_change` | INT | Points delta (positive or negative, default 0) |
| `team_id` | UUID | FK → `teams.id` (nullable, NULL for individual) |
| `task_id` | UUID | FK → `tasks.id` (nullable) |
| `achievement_id` | UUID | FK → `achievements.id` (nullable) |
| `revenue_stream_id` | UUID | FK → `revenue_streams.id` (nullable) |
| `activity_type` | TEXT | `"individual"` or `"team"` |
| `points_type` | TEXT | `"individual"` or `"team"` (nullable) |
| `description` | TEXT | Human-readable reason (nullable) |
| `metadata` | JSONB | Arbitrary extra data (nullable) |
| `validated_by_user_id` | UUID | FK → `users.id` — peer review validator (nullable) |
| `week_number` | INT | ISO week number (nullable) |
| `week_year` | INT | ISO year (nullable) |
| `created_at` | TIMESTAMP | Transaction timestamp |

**Note:** No unique constraint — multiple identical transactions can exist (by design for audit trail).

### `users` (Economy-Relevant Columns)

| Column | Type | Description |
|--------|------|-------------|
| `total_xp` | INT | Running XP total (maintained by RPC) |
| `total_points` | INT | Running points total (maintained by RPC) |

---

## Transaction Types

| Type | Trigger | XP | Points | Direction | Code Path |
|------|---------|----|----|-----------|-----------|
| `task` | Task completion & approval | `base_xp_reward` | `base_points_reward` | Positive | `complete_individual_task` RPC / peer review approval |
| `validation` | Peer review submitted | 10% of task XP | 10% of task points | Positive | `submit_external_peer_review` RPC |
| `achievement` | Achievement unlocked | `achievement.xp_reward` | `achievement.points_reward` | Positive | `check_and_award_achievement` RPC |
| `meeting` | Client meeting completed | Meeting reward | Meeting reward | Positive | `complete_meeting` RPC |
| `revenue` | Revenue stream validated | 0 (typically) | MRR amount | Positive | Admin validation |
| `team_cost` | Team formation/maintenance | 0 | Negative | Negative | Team creation RPC |
| `weekly_report_penalty` | Missed weekly report deadline | 0 | Negative | Negative | DB trigger/scheduled job |
| `weekly_report_refund` | All strike explanations accepted | 0 | +100 per member | Positive | `POST /api/admin/resolve-strike` |

---

## How Each Transaction Type Is Created

### Task Completion (`type: "task"`)

**Individual tasks:** `complete_individual_task` RPC auto-approves and creates transaction atomically.

**Team tasks:** Transaction created when peer reviewer approves via `submit_external_peer_review` RPC.

- `xp_change`: `tasks.base_xp_reward`
- `points_change`: `tasks.base_points_reward`
- `activity_type`: `"individual"` or `"team"` (from task context)
- `team_id`: Set for team context, NULL for individual

### Peer Review Reward (`type: "validation"`)

Created when reviewer submits approved/rejected decision:

- `xp_change`: `floor(base_xp_reward * 0.10)`
- `points_change`: `floor(base_points_reward * 0.10)`
- `activity_type`: `"individual"` (personal reward)
- `team_id`: NULL
- Minimum: 1 XP, 1 Point

### Achievement Unlock (`type: "achievement"`)

Created by `check_and_award_achievement` RPC when criteria met:

- `xp_change`: `achievements.xp_reward`
- `points_change`: `achievements.points_reward`
- `achievement_id`: Set
- `activity_type`: `"individual"`

### Client Meeting (`type: "meeting"`)

Created by `complete_meeting` RPC when draft meeting is submitted:

- `xp_change`: 50 (default)
- `points_change`: 25 (default)
- `activity_type`: `"team"`
- `team_id`: Set

### Revenue Stream (`type: "revenue"`)

Created when admin validates a revenue stream entry:

- `xp_change`: 0 (typically)
- `points_change`: MRR amount
- `revenue_stream_id`: Set
- `activity_type`: `"team"`

### Team Cost (`type: "team_cost"`)

Charged on team creation/maintenance:

- `xp_change`: 0
- `points_change`: Negative amount
- `activity_type`: `"team"`
- `team_id`: Set

### Weekly Report Penalty (`type: "weekly_report_penalty"`)

Auto-created when team misses report deadline:

- `xp_change`: 0
- `points_change`: Negative penalty amount
- `activity_type`: `"team"`
- `week_number`, `week_year`: Set

### Weekly Report Refund (`type: "weekly_report_refund"`)

**File:** `src/app/api/admin/resolve-strike/route.ts`

Created when ALL strikes for a team+week are resolved:

1. Check for existing refund (prevent duplicates)
2. Insert refund transaction for each active team member
3. Call `increment_user_points(p_user_id, 100)` per member
4. Send notification per member

- `xp_change`: 0
- `points_change`: +100 (REFUND_POINTS constant)
- `description`: "Weekly report penalty refunded — all explanations accepted (Week X, YYYY)"
- `activity_type`: `"team"`, `points_type`: `"team"`

---

## Points vs XP

| | XP | Points |
|---|---|--------|
| Purpose | Progress tracking | Currency balance |
| Can decrease? | Only via penalties | Yes (costs, penalties) |
| Ranking metric | Primary (sort by XP) | Secondary (tiebreaker) |
| Earned from | Tasks, reviews, meetings, achievements | Tasks, reviews, meetings, achievements, revenue |
| Spent on | Nothing (display only) | Team costs, penalties |

---

## Points Classification

The `points_type` field categorizes transactions:

| Value | Meaning | Example |
|-------|---------|---------|
| `"individual"` | Personal activity, no team involved | Peer review reward, individual task |
| `"team"` | Team-related activity | Team task, meeting, penalty, refund |
| `NULL` | Legacy or unclassified | Older transactions |

The `activity_type` field works similarly but is always set:

| Activity Type | team_id | Example |
|--------------|---------|---------|
| `"individual"` | NULL | Individual task, peer review |
| `"team"` | Set | Team task, meeting, penalty |

---

## User Totals Maintenance

### How Totals Are Updated

User totals are **NOT** recalculated from transactions on each read. They are maintained atomically:

- **`users.total_points`** — Updated via `increment_user_points(p_user_id, p_amount)` RPC
- **`users.total_xp`** — Updated within transaction-creating RPC functions (e.g., `complete_individual_task`, `submit_external_peer_review`)

### `increment_user_points` RPC

```typescript
increment_user_points(p_user_id: string, p_amount: number) → number
```

Atomically increments `users.total_points` and returns the new total.

### Data Consistency

Totals should be reconcilable by summing transactions:
```sql
-- Verify points total
SELECT SUM(points_change) FROM transactions WHERE user_id = ?;
-- Should equal users.total_points

-- Verify XP total
SELECT SUM(xp_change) FROM transactions WHERE user_id = ?;
-- Should equal users.total_xp
```

---

## Transaction History Page

**Route:** `/dashboard/transaction-history`
**File:** `src/app/dashboard/transaction-history/page.tsx`

### Summary Cards

- **Total XP** — from `user.total_xp`
- **Total Credits** — from `user.total_points`

### Transaction List

Fetches last 50 transactions via `getUserTransactions(user.id, 50)`.

**Columns displayed:**
- Icon (type-specific: CheckCircle for task, DollarSign for revenue, Trophy for validation, Users for team_cost)
- Description (from `transaction.description` or type-specific template)
- XP badge (pink)
- Points badge (pink)
- Type badge (capitalized)
- Timestamp (formatted: "MMM DD, YYYY HH:mm")

**Data includes joins:**
- `team` → team name
- `achievement` → achievement name
- `revenue_stream` → product name

---

## Query Functions

### User Transaction Queries

**File:** `src/lib/data/users.ts`

| Function | Purpose | Returns |
|----------|---------|---------|
| `getUserTransactions(userId, limit=10)` | Last N transactions with joins | Transaction[] with team, achievement, revenue_stream |
| `getPeerReviewStatsFromTransactions(userId)` | Review stats (from Nov 2025+) | `{ tasksReviewedByUser, totalXpEarned, totalPointsEarned }` |
| `getIndividualXPAndCredits(userId)` | Individual gains only (team_id NULL) | `{ totalXP, totalCredits, transactionCount }` |
| `getIndividualActivityStats(userId)` | Individual breakdown by type | `{ totalXpEarned, totalPointsEarned, meetingsCompleted, achievementsEarned }` |

### Team Transaction Queries

**File:** `src/lib/data/teams.ts`

| Function | Purpose | Returns |
|----------|---------|---------|
| `getTeamPointsInvested(teamId)` | Sum of negative points_change | Absolute value (positive number) |
| `getTeamPointsEarned(teamId)` | Sum of positive points_change | Total earned |
| `getTeamXPEarned(teamId)` | Sum of positive xp_change | Total XP |
| `getTeamStatsCombined(teamId)` | All 3 stats in single RPC call | `{ pointsInvested, pointsEarned, xpEarned }` |
| `getTeamActivityStats(userId, teamId)` | User's activity in team | Breakdown by task, validation types |

---

## Real-Time Subscriptions

**File:** `src/lib/data/utilities.ts`

```typescript
subscribeToUserTransactions(userId, callback)
```

Subscribes to Supabase Realtime `postgres_changes` on the `transactions` table, filtered by `user_id`. Fires callback on every new INSERT.

---

## Leaderboard Snapshot Connection

Leaderboard snapshots capture weekly totals from transaction aggregation:

1. `generate_weekly_leaderboard_snapshots` RPC runs (typically Sunday night)
2. For each user: aggregates `total_xp`, `total_points` from user record
3. Counts `tasks_completed`, `achievements_count`
4. Calculates `rank_position` based on XP
5. Stores in `leaderboard_snapshots` table

Team snapshots aggregate all active members' stats similarly.

Week-over-week changes are calculated by comparing current vs previous week snapshots.

---

## RPC Functions Reference

| Function | Purpose |
|----------|---------|
| `increment_user_points(p_user_id, p_amount)` | Atomic points increment, returns new total |
| `complete_individual_task(p_progress_id, ...)` | Auto-approve + create task transaction |
| `submit_external_peer_review(p_progress_id, ...)` | Review decision + validation transaction |
| `complete_meeting(p_meeting_id)` | Meeting completion + meeting transaction |
| `check_and_award_achievement(...)` | Achievement unlock + achievement transaction |
| `get_team_stats_combined(p_team_id)` | Aggregate team transaction stats |
| `generate_weekly_leaderboard_snapshots(...)` | Weekly snapshot from totals |

---

## Business Rules

1. **Immutable audit trail** — Transactions are never updated or deleted
2. **Atomic totals** — User totals updated via RPC, not client-side calculation
3. **10% peer review reward** — Automatic, not configurable per task
4. **Refunds require ALL strikes resolved** — No partial refunds
5. **Refund amount is fixed** — 100 points per member (REFUND_POINTS constant)
6. **Week boundaries use Riga timezone** — `get_riga_week_boundaries()` ensures consistency
7. **Duplicate refund protection** — Checks existing refund transactions before creating

---

## File Reference

| File | Purpose |
|------|---------|
| `src/types/database.ts` | Transaction table types + RPC signatures |
| `src/lib/data/users.ts` | User transaction queries |
| `src/lib/data/teams.ts` | Team transaction queries |
| `src/lib/data/leaderboard.ts` | Snapshot generation |
| `src/lib/data/utilities.ts` | Realtime subscription helper |
| `src/lib/database.ts` | Public API facade |
| `src/lib/tasks.ts` | Task completion (triggers transactions via RPC) |
| `src/app/dashboard/transaction-history/page.tsx` | Transaction history UI |
| `src/app/api/admin/resolve-strike/route.ts` | Refund transaction creation |
