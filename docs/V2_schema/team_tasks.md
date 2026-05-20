# `team_tasks`

Task templates for the team journey. Global, admin-managed. Each task belongs to exactly one team stage. Teams pick freely from the active task pool of their current stage (buffet model).

**All team tasks require review before approval.** That's the gate that makes a team task count toward stage progress. Two task types determine *who* reviews:
- `standard` → peer reviewer (a user who is NOT a member of the submitting team)
- `confidential` → admin reviewer only (sensitive data; not exposed to peers)

Submission is by one team member on behalf of the team; the reward is split to every currently-active member when the review approves.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `stage_id` | uuid | NO | — | FK → `team_stages(id)` ON DELETE RESTRICT |
| `slug` | text | NO | — | stable machine name |
| `title` | text | NO | — | display title |
| `description` | text | YES | — | short blurb shown in task list |
| `instructions` | text | YES | — | full task instructions (markdown allowed) |
| `task_type` | enum `team_task_type` | NO | `'standard'` | `standard` (peer-reviewed) or `confidential` (admin-reviewed only) |
| `xp_reward_per_member` | int | NO | `0` | XP each active team member receives on approval |
| `points_reward_per_member` | int | NO | `0` | points each active team member receives on approval |
| `peer_review_xp_reward` | int | NO | `0` | XP the reviewer earns for completing the peer review |
| `peer_review_points_reward` | int | NO | `0` | points the reviewer earns |
| `peer_review_criteria` | jsonb | YES | — | rubric items the reviewer scores against |
| `peer_review_due_hours` | int | NO | `72` | how long a reviewer has to complete an assigned review |
| `is_recurring` | bool | NO | `false` | when true, the team can pick this task again after `cooldown_days` since their last completion |
| `cooldown_days` | int | YES | — | required when `is_recurring = true`; days the team must wait between completions |
| `estimated_hours` | numeric | YES | — | hint for the team |
| `difficulty` | enum `task_difficulty` | YES | — | reuses individual enum |
| `submission_form_schema` | jsonb | YES | — | field schema for the team submission form |
| `resources` | jsonb | YES | — | external links / materials |
| `tags` | text[] | YES | — | freeform tags for filtering |
| `order_index` | int | YES | — | optional sort hint within stage |
| `is_active` | bool | NO | `true` | soft-disable without deleting |
| `created_by_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL |
| `metadata` | jsonb | YES | — | overflow |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `team_task_type` | `standard`, `confidential` |
| `task_difficulty` | shared with `individual_tasks`: `easy`, `medium`, `hard` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `stage_id` → `team_stages(id)` ON DELETE RESTRICT |
| FOREIGN KEY | `created_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| UNIQUE | `slug` |
| CHECK | `xp_reward_per_member >= 0` |
| CHECK | `points_reward_per_member >= 0` |
| CHECK | `peer_review_xp_reward >= 0` |
| CHECK | `peer_review_points_reward >= 0` |
| CHECK | `peer_review_due_hours > 0` |
| CHECK | `is_recurring = false OR cooldown_days > 0` — recurring tasks must have a positive cooldown |
| CHECK | `is_recurring = true OR cooldown_days IS NULL` — non-recurring tasks have no cooldown |

## Indexes

| Index | Purpose |
|---|---|
| `(stage_id, is_active)` | "show me active tasks for this stage" |
| `(stage_id, order_index)` | ordered listing within a stage |
| GIN on `tags` | tag-based filtering |

## Rules

- Admin-only writes. All authenticated users SELECT active tasks.
- `stage_id` ON DELETE RESTRICT — admins must deactivate or move tasks before dropping a stage.
- **Buffet model.** No required tasks. Stage advances when team completes `>= unlock_threshold_percent` of active tasks for that stage. "Complete" here means **peer-review approved**.
- All team tasks require review before approval — no flag to skip it. The reviewer pool depends on `task_type`:
  - `standard` → any active team-journey user who is NOT a member of the submitting team
  - `confidential` → admins only. Sensitive submissions are never exposed to peer users.
- Reward fields are **per-member** to make the split explicit. The submission's approval triggers one `transactions` row per currently-active team member.
- The peer reviewer is paid via `peer_review_xp_reward` / `peer_review_points_reward` — lands in their `team_exp` / `team_points` cache.
- **Admin reviewers earn nothing** for reviewing confidential tasks. Admins don't need XP to graduate. The `team_task_reviews` row for an admin review records the decision but does not create a reviewer-reward `transactions` row.
- Admins may add tasks to an active stage at any time. Existing in-progress teams keep their snapshotted `tasks_total_count`; new tasks become available in the buffet immediately.
- **Recurring tasks** (e.g. weekly client calls): when a team approves a recurring task, they cannot pick it again until `cooldown_days` have passed since their last completion. Each completion triggers full reward fan-out; **stage progress counts the task once** (distinct task), not per-completion.

## What's intentionally NOT here

| Concern | Reason |
|---|---|
| `requires_peer_review` flag | All team tasks require review — peer or admin depending on `task_type`. No skip flag. |
| Per-task assignment to a specific member | Any team member can pick up and submit. Assignment is captured on `team_task_progress`, not the template. |
