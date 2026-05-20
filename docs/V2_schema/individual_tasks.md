# `individual_tasks`

Task templates for the individual journey. Global, admin-managed. Each task belongs to exactly one stage. Users pick freely from the active task pool of their current stage (buffet model).

Individual tasks **auto-approve on submit** — no peer review, no admin review. The user fills the submission form (if any), confirms, and the reward fires immediately. Peer review is a team-journey concept only.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `stage_id` | uuid | NO | — | FK → `individual_stages(id)` ON DELETE RESTRICT |
| `slug` | text | NO | — | stable machine name for referencing in code/migrations |
| `title` | text | NO | — | display title |
| `description` | text | YES | — | short blurb shown in task list |
| `instructions` | text | YES | — | full task instructions (markdown allowed) |
| `xp_reward` | int | NO | `0` | base XP awarded on completion |
| `points_reward` | int | NO | `0` | base points awarded on completion |
| `estimated_minutes` | int | YES | — | hint for the user |
| `difficulty` | enum `task_difficulty` | YES | — | `easy`, `medium`, `hard` |
| `submission_form_schema` | jsonb | YES | — | field schema for the submission form |
| `resources` | jsonb | YES | — | external links / materials (e.g. `[{label, url}]`) |
| `tags` | text[] | YES | — | freeform tags for filtering |
| `order_index` | int | YES | — | optional sort hint within stage |
| `is_active` | bool | NO | `true` | soft-disable without deleting |
| `created_by_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL — admin who authored |
| `metadata` | jsonb | YES | — | overflow |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `task_difficulty` | `easy`, `medium`, `hard` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `stage_id` → `individual_stages(id)` ON DELETE RESTRICT |
| FOREIGN KEY | `created_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| UNIQUE | `slug` |
| CHECK | `xp_reward >= 0` |
| CHECK | `points_reward >= 0` |
| CHECK | `estimated_minutes IS NULL OR estimated_minutes > 0` |

## Indexes

| Index | Purpose |
|---|---|
| `(stage_id, is_active)` | "show me active tasks for this stage" — primary read pattern |
| `(stage_id, order_index)` | ordered listing within a stage |
| GIN on `tags` | tag-based filtering |

## Rules

- Admin-only writes. RLS allows all users to SELECT active tasks (`is_active = true`), only admins INSERT/UPDATE/DELETE.
- `stage_id` ON DELETE RESTRICT — can't drop a stage while tasks reference it. Force admin to deactivate or move tasks first.
- Task **count** for a stage (used for `progress_percent` math) = `COUNT(*) WHERE stage_id = X AND is_active = true`. Counted on stage unlock and snapshotted on `individual_journey.tasks_total_count` for stable percentages.
- Buffet model: no required tasks. Stage advances when user completes `>= unlock_threshold_percent` of active tasks for that stage.
- **Auto-approve only.** No admin or peer review on individual tasks. Submission = completion = reward, in one atomic step.
- Admins can add tasks to an active stage at any time. Existing users keep their snapshotted `tasks_total_count` (stable %); new tasks become available in the buffet immediately. New users entering the stage get the fresh count.
- Updating reward values after users have already completed the task does NOT retroactively change their existing `transactions` rows.

## What's intentionally NOT here

| Concern | Reason |
|---|---|
| Peer review fields | Peer review is a team-journey concept only. Lives in `team_task_reviews` within the team domain. |
| `requires_review` (peer-style) | See above. |
| `prerequisite_template_codes` | Buffet model — no per-task prerequisites within a stage. Stage gating handles ordering. |
| `is_recurring` / `cooldown_days` | Individual journey tasks are one-shot completions. Recurring patterns belong to team journey if needed. |
| `achievement_id` | Achievements are dropped in V2 — replaced by milestones. Stage progress drives milestone unlocks via `individual_milestone_unlocks`. |
