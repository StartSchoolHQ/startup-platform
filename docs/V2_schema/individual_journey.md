# `individual_journey`

Per-user progression state for the individual journey. One row per `(user, stage)` pair. Tracks unlock state, progress counts, and timestamps. Drives the "Your Founder Quest" UI.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE CASCADE |
| `stage_id` | uuid | NO | — | FK → `individual_stages(id)` ON DELETE RESTRICT |
| `status` | enum `journey_status` | NO | `'locked'` | `locked` / `current` / `completed` |
| `tasks_completed_count` | int | NO | `0` | cache, rebuilt from `individual_task_progress` (status=approved) |
| `tasks_total_count` | int | NO | `0` | snapshot of active tasks in this stage at unlock time — keeps progress % stable if admin adds tasks later |
| `progress_percent` | int | NO | GENERATED | `tasks_completed_count * 100 / NULLIF(tasks_total_count, 0)` STORED |
| `unlocked_at` | timestamptz | YES | — | when status went `locked → current` |
| `started_at` | timestamptz | YES | — | when user picked their first task in this stage |
| `completed_at` | timestamptz | YES | — | when status went `current → completed` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `user_id` → `users.data(id)` ON DELETE CASCADE |
| FOREIGN KEY | `stage_id` → `individual_stages(id)` ON DELETE RESTRICT |
| UNIQUE | `(user_id, stage_id)` |
| UNIQUE (partial) | `(user_id) WHERE status = 'current'` — only one current stage per user |
| CHECK | `tasks_completed_count >= 0` |
| CHECK | `tasks_total_count >= 0` |
| CHECK | `tasks_completed_count <= tasks_total_count` |
| CHECK | `(status = 'completed') = (completed_at IS NOT NULL)` |
| CHECK | `status = 'locked' OR unlocked_at IS NOT NULL` |

## Indexes

| Index | Purpose |
|---|---|
| `(user_id, status)` | "what's the user's current stage?" — primary read |
| `(stage_id, status)` | admin: "who's working on stage X?" |
| `(user_id, stage_id)` | already unique — covers point lookups |

## Rules

- **One row per user per stage.** When a user signs up, a row is created for each active `individual_stages` entry: the first stage in `order_index` order is `current`, the rest `locked`.
- **Stage advancement** (handled in SECURITY DEFINER function, called from `individual_task_progress` approval trigger):
  1. User completes a task → `tasks_completed_count` increments
  2. Function reads `progress_percent` and the stage's `unlock_threshold_percent`
  3. If `progress_percent >= unlock_threshold_percent` AND status = `current`:
     - Mark current row `status = 'completed'`, set `completed_at`
     - Mark next stage's row (by `order_index`) `status = 'current'`, set `unlocked_at`
     - Snapshot `tasks_total_count` for the newly-current stage from `individual_tasks`
  4. Function checks for milestones at this threshold and inserts `individual_milestone_unlocks` rows (which in turn create `transactions` for the bonus rewards)
- **`tasks_total_count` is snapshotted on unlock** to keep the user's progress % stable if admin adds tasks to the stage later. Recomputing live would surprise users by dropping their %.
- **Buffet model**: user keeps earning XP from completing optional tasks past the threshold — they just don't need to. `progress_percent` can exceed the unlock threshold and even reach 100%.
- **Locked stages have no work.** Tasks for a locked stage are not visible to the user in the UI.
- **No cross-journey coupling.** Team journey progression is tracked separately in `team_journey` — different rules, different table.

## Visual mapping (from "Your Founder Quest" UI)

| UI element | Source |
|---|---|
| Stage card title ("Mindset", "Skills", …) | `individual_stages.name` |
| `28/30` task count | `tasks_completed_count / tasks_total_count` |
| `92%` | `progress_percent` |
| `STAGE 3 — CURRENT` | `status = 'current'` |
| `LOCKED` | `status = 'locked'` |
| Stage XP earned | `SUM(transactions.xp_change)` joined via `source_table='individual_task_progress'` and the task's `stage_id` |
| `2/4 milestones` | count from `individual_milestone_unlocks` vs total active milestones for the stage |
