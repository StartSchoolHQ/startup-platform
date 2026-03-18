# Achievements System

> Achievements are milestone-based goals that unlock when users or teams complete a set of linked tasks. Each achievement awards XP and points on unlock. Achievements drive task organization — clicking an achievement filters the task list to show only its linked tasks.

## Overview

The achievements system provides:

- **Goal structure** — Group related tasks under named achievements
- **Progress tracking** — Visual progress bars showing completed/total tasks
- **Rewards** — XP and points awarded on achievement unlock
- **Task filtering** — Click an achievement to filter the task table
- **Dual context** — Individual achievements (per user) and team achievements (per team)

---

## Database Schema

### `achievements` (Master Definitions)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Achievement name |
| `description` | TEXT | Achievement description (nullable) |
| `icon` | TEXT | Icon identifier: `trophy`, `star`, `target`, `check`, `clock`, `circle` |
| `xp_reward` | INT | XP awarded on unlock (nullable) |
| `points_reward` | INT | Points awarded on unlock (nullable) |
| `color_theme` | TEXT | Color theme for UI display (nullable) |
| `context` | `task_context_type` | `"individual"` or `"team"` |
| `sort_order` | INT | Display order in UI (nullable) |
| `active` | BOOLEAN | Availability flag (nullable) |
| `created_at` | TIMESTAMP | Creation time |

No foreign key constraints — achievements are standalone reference data.

### `user_achievements` (Individual Unlock Records)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `users.id` |
| `achievement_id` | UUID | FK → `achievements.id` |
| `completed_at` | TIMESTAMP | When unlocked (nullable) |
| `points_awarded` | INT | Actual points given (nullable) |
| `xp_awarded` | INT | Actual XP given (nullable) |
| `created_at` | TIMESTAMP | Record creation time |

### `team_achievements` (Team Unlock Records)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `team_id` | UUID | FK → `teams.id` |
| `achievement_id` | UUID | FK → `achievements.id` |
| `completed_at` | TIMESTAMP | When team unlocked |
| `points_awarded` | INT | Points awarded (split among members, nullable) |
| `xp_awarded` | INT | XP awarded (split among members, nullable) |
| `created_at` | TIMESTAMP | Record creation time |

### Task Linkage

Tasks link to achievements via `tasks.achievement_id` (UUID, FK → `achievements.id`). Multiple tasks can link to the same achievement — the achievement unlocks when all linked tasks are completed.

---

## Achievement Unlock Flow

### Individual Achievements

```
User completes individual task → auto-approved
  → check_and_award_achievement(userId, achievementId) RPC
    → Are ALL linked tasks with this achievement_id approved?
      → Yes: INSERT into user_achievements
        → Transaction created (type: "achievement")
          → XP + points awarded to user
            → Notification sent (type: "achievement")
      → No: No action (progress updated on next query)
```

### Team Achievements

```
Team member completes team task → peer review approved
  → check_and_award_achievement or award_team_achievement RPC
    → Are ALL linked team tasks approved?
      → Yes: INSERT into team_achievements
        → Rewards split among active team members
          → Transaction per member (type: "achievement")
            → Notifications sent
      → No: No action
```

### Key Difference

| Aspect | Individual | Team |
|--------|-----------|------|
| Context | `context = "individual"` | `context = "team"` |
| Stored in | `user_achievements` | `team_achievements` |
| Trigger | User completes all linked individual tasks | Team completes all linked team tasks |
| Rewards | Full amount to user | Split among active team members |
| Display | My Journey achievements tab | Team Journey achievements section |

---

## RPC Functions

### `check_and_award_achievement(p_user_id, p_achievement_id) → Json`

Checks if user has completed all requirements and awards achievement if criteria met.

**Returns:** Transaction/award details as JSON.

### `award_team_achievement(p_team_id, p_achievement_id) → Json`

Awards achievement to entire team, splits rewards among active members.

### `get_user_achievement_progress(p_user_id) → Table`

Returns achievement progress for a user:

```typescript
{
  achievement_id: string;
  achievement_name: string;
  achievement_description: string;
  achievement_icon: string;
  color_theme: string;
  xp_reward: number;
  points_reward: number;
  sort_order: number;
  total_tasks: number;      // Tasks linked to this achievement
  completed_tasks: number;  // Tasks with status "approved"
  status: string;           // "completed" | "in-progress" | "not-started"
  is_completed: boolean;
}
```

### `get_tasks_by_achievement(p_achievement_id?, p_team_id?) → Table`

Returns all tasks linked to an achievement with their progress:

```typescript
{
  achievement_id: string;
  achievement_name: string;
  task_id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: number;
  base_xp_reward: number;
  base_points_reward: number;
  status: string;
  progress_id: string;
  assigned_to_user_id: string;
  assignee_name: string;
  // ... more fields
}
```

### `get_team_achievement_dashboard(p_team_id, p_user_id) → Table`

Single optimized RPC combining achievements + tasks + client meetings for team dashboard. Reduces 3 separate queries to 1.

---

## Progress Tracking

### Status Calculation

| Status | Condition |
|--------|-----------|
| `completed` | `user_achievements.completed_at IS NOT NULL` (or `team_achievements`) |
| `in-progress` | `completed_tasks > 0 AND completed_tasks < total_tasks` |
| `not-started` | `completed_tasks = 0` |

### Progress Display

- Achievement cards show: `{completed_tasks}/{total_tasks} tasks`
- Progress bar: `(completed_tasks / total_tasks) * 100%` width
- Animated progress bar with color coding by status

**Note:** Progress depends on `task_progress` records, which are created lazily. Achievements show `0/X` until user starts their first task.

---

## Frontend Components

### AchievementCard (Dashboard Version)

**File:** `src/components/dashboard/achievement-card.tsx`

**Props:**
```typescript
{
  achievement: Achievement;
  isSelected: boolean;
  onClick: (achievementId: string | null) => void;
}
```

**Status Colors:**
| Status | Background | Icon | Badge |
|--------|-----------|------|-------|
| Completed | `bg-purple-50` | `purple-600` | `purple-600` |
| In-progress | `bg-orange-50` | `orange-600` | `orange-500` |
| Not-started | `bg-gray-50` | `gray-500` | `gray-100` |

**Features:**
- Icon mapping: trophy, star, target, check, clock, circle (Lucide React)
- Progress bar (animated)
- XP and points rewards display
- Status indicator (Done/Active/Locked)
- Clickable for task filtering

### AchievementGrid

**File:** `src/components/dashboard/achievement-grid.tsx`

- Responsive grid: 1 col (mobile), 2 (tablet), 3 (desktop), 4 (large)
- Selection state tracking
- Filter banner showing selected achievement name
- "Show All Tasks" button to clear filter

### AchievementCard (My Journey Version)

**File:** `src/components/my-journey/achievement-card.tsx`

Different styling — Medal icon, green for finished, simpler layout.

---

## Pages Integration

### My Journey (`/dashboard/my-journey`)

**File:** `src/app/dashboard/my-journey/page.tsx`

**Achievements Tab:**
1. Grid of achievement cards from `getUserAchievementProgress(userId)`
2. Click card → `setSelectedAchievementId(id)` → filters task table below
3. Filter banner shows selected achievement name
4. "Show All Tasks" clears filter

**Stats Card:** "Achievement Rate" = `(completed / total) * 100%`

**React Query:**
```typescript
queryKey: ["myJourney", "achievements", userId]
queryFn: () => getUserAchievementProgress(userId)
```

### Team Journey (`/dashboard/team-journey/[id]`)

Uses `getTeamAchievementDashboard(teamId, userId)` — optimized single RPC call. Displays team achievements with progress.

### Leaderboard

Displays `achievements_count` column with week-over-week change from snapshots.

---

## Data Layer

**File:** `src/lib/data/achievements.ts` (335 lines)

| Function | Purpose |
|----------|---------|
| `getUserAchievementProgress(userId)` | User's achievement progress via RPC |
| `getTasksByAchievement(achievementId?, teamId?)` | Tasks linked to achievement via RPC |
| `checkAndAwardAchievement(userId, achievementId)` | Validate criteria + award via RPC |
| `getTeamAchievementDashboard(teamId, userId)` | Optimized: achievements + tasks + meetings in 1 call |
| `getTeamAchievements(teamId)` | Direct query of team achievements with task progress counts |

---

## Transaction Records

When an achievement is unlocked, a transaction is created:

```typescript
{
  type: "achievement",
  user_id: userId,
  achievement_id: achievementId,
  xp_change: achievement.xp_reward,
  points_change: achievement.points_reward,
  activity_type: "individual" | "team",
  description: "Unlocked achievement: {name}",
}
```

---

## Types

### Dashboard Achievement Interface

**File:** `src/types/dashboard.ts`

```typescript
interface Achievement {
  achievement_id: string;
  achievement_name: string;
  achievement_description: string;
  achievement_icon: string;
  xp_reward: number;
  credits_reward: number;
  color_theme: string;
  sort_order: number;
  total_tasks: number;
  completed_tasks: number;
  status: "completed" | "in-progress" | "not-started";
  is_completed: boolean;
}
```

---

## Admin Management

**Current state:** No dedicated admin achievement management page exists. Achievements are managed directly in the database.

Admin can:
- Link/unlink tasks to achievements via `achievement_id` in create/edit task dialogs
- Query achievements table directly via Supabase dashboard

---

## Implementation Notes

1. **Lazy progress dependency** — Achievement progress counts depend on `task_progress` records. Since progress is created lazily, achievements show `0/X` until users interact with tasks.
2. **Team reward splitting** — Team achievement rewards are split equally among active members via database RPC logic.
3. **No cascading deletes** — Deleting an achievement doesn't cascade to tasks (FK without CASCADE). Tasks become orphaned.
4. **Optimization** — `get_team_achievement_dashboard()` replaces 3 queries with 1 RPC call (66% reduction in network round trips).
5. **Transactional integrity** — Achievement unlock + transaction creation are atomic within the RPC function.
6. **Context isolation** — Individual achievements only count individual tasks; team achievements only count team tasks.

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/data/achievements.ts` | Core achievement data functions (335 lines) |
| `src/components/dashboard/achievement-card.tsx` | Dashboard achievement card (172 lines) |
| `src/components/dashboard/achievement-grid.tsx` | Responsive grid container (74 lines) |
| `src/components/my-journey/achievement-card.tsx` | My Journey card variant (136 lines) |
| `src/app/dashboard/my-journey/page.tsx` | Achievements tab + task filtering |
| `src/app/dashboard/team-journey/[id]/page.tsx` | Team achievement display |
| `src/types/dashboard.ts` | Achievement interface definitions |
| `src/types/my-journey.ts` | Simpler achievement interface |
| `src/types/database.ts` | Auto-generated DB types + RPC signatures |
