# `team_journey`

Per-team progression state for the team journey. One row per `(team, stage)` pair. Mirror of `individual_journey` but keyed by team. Drives the team's "Founder Quest" UI.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `team_id` | uuid | NO | — | FK → `teams(id)` ON DELETE CASCADE |
| `stage_id` | uuid | NO | — | FK → `team_stages(id)` ON DELETE RESTRICT |
| `status` | enum `journey_status` | NO | `'locked'` | `locked` / `current` / `completed` (shared enum with individual) |
| `tasks_completed_count` | int | NO | `0` | cache, rebuilt from `team_task_progress` (status = approved) |
| `tasks_total_count` | int | NO | `0` | snapshot of active tasks at unlock time — keeps progress % stable |
| `progress_percent` | int | NO | GENERATED | `tasks_completed_count * 100 / NULLIF(tasks_total_count, 0)` STORED |
| `unlocked_at` | timestamptz | YES | — | when status went `locked → current` |
| `started_at` | timestamptz | YES | — | when team picked their first task in this stage |
| `completed_at` | timestamptz | YES | — | when status went `current → completed` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `team_id` → `teams(id)` ON DELETE CASCADE |
| FOREIGN KEY | `stage_id` → `team_stages(id)` ON DELETE RESTRICT |
| UNIQUE | `(team_id, stage_id)` |
| UNIQUE (partial) | `(team_id) WHERE status = 'current'` — only one current stage per team |
| CHECK | `tasks_completed_count >= 0` |
| CHECK | `tasks_total_count >= 0` |
| CHECK | `tasks_completed_count <= tasks_total_count` |
| CHECK | `(status = 'completed') = (completed_at IS NOT NULL)` |
| CHECK | `status = 'locked' OR unlocked_at IS NOT NULL` |

## Indexes

| Index | Purpose |
|---|---|
| `(team_id, status)` | "what's the team's current stage?" |
| `(stage_id, status)` | admin: "which teams are on stage X?" |

## Rules

- One row per team per stage. When a team is created (or activated for team journey), a row is created for each active `team_stages` entry: first stage in `order_index` order is `current`, the rest `locked`.
- **Stage advancement** (handled in SECURITY DEFINER function, called from `team_task_progress` approval trigger):
  1. Team task approved (post peer-review) → `tasks_completed_count` increments
  2. If `progress_percent >= unlock_threshold_percent` AND status = `current`:
     - Mark current row `completed`, set `completed_at`
     - Mark next stage's row `current`, set `unlocked_at`
     - Snapshot `tasks_total_count` for the newly-current stage from `team_tasks`
  3. Function checks for milestone unlocks at this threshold and inserts `team_milestone_unlocks`
- **`tasks_total_count` is snapshotted on unlock** — same stable-progress reasoning as individual journey.
- **No cross-journey coupling.** Individual journey progression lives in `individual_journey`. Independent tables, independent rules.
- A team's progression is shared across all members. Joining members inherit the team's current stage state. Leaving members keep their historical `transactions` but the team's row continues.

## Visual mapping (team Founder Quest UI)

| UI element | Source |
|---|---|
| Stage card title | `team_stages.name` |
| `13/31` task count | `tasks_completed_count / tasks_total_count` |
| `42%` | `progress_percent` |
| `STAGE 3 — CURRENT` | `status = 'current'` |
| `LOCKED` | `status = 'locked'` |
| Stage XP earned (per team) | `SUM(transactions.xp_change)` joined via `source_table='team_task_progress'` filtered by team_id and stage |
| `2/4 milestones` | `COUNT(team_milestone_unlocks)` for the stage / total active milestones for the stage |
