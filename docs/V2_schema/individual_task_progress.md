# `individual_task_progress`

Per-user state for an individual task. One row per `(user, task)` pair. Auto-approves on submission — no review step. Submission = completion = reward, in one atomic operation.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE CASCADE |
| `task_id` | uuid | NO | — | FK → `individual_tasks(id)` ON DELETE RESTRICT |
| `status` | enum `individual_task_status` | NO | `'in_progress'` | see enum |
| `started_at` | timestamptz | NO | `now()` | when user picked up the task |
| `completed_at` | timestamptz | YES | — | set on submission (auto-approve) |
| `cancelled_at` | timestamptz | YES | — | when user abandoned the task |
| `submission_data` | jsonb | YES | — | structured form fields |
| `submission_url` | text | YES | — | optional single URL submission |
| `submission_notes` | text | YES | — | freeform user notes |
| `xp_awarded` | int | YES | — | snapshotted at completion (matches `transactions.xp_change`) |
| `points_awarded` | int | YES | — | snapshotted at completion |
| `transaction_id` | uuid | YES | — | FK → `transactions(id)` ON DELETE SET NULL — the reward row |
| `metadata` | jsonb | YES | — | overflow |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `individual_task_status` | `in_progress`, `completed`, `cancelled` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `user_id` → `users.data(id)` ON DELETE CASCADE |
| FOREIGN KEY | `task_id` → `individual_tasks(id)` ON DELETE RESTRICT |
| FOREIGN KEY | `transaction_id` → `transactions(id)` ON DELETE SET NULL |
| UNIQUE | `(user_id, task_id)` — one progress row per task per user |
| CHECK | `xp_awarded IS NULL OR xp_awarded >= 0` |
| CHECK | `points_awarded IS NULL OR points_awarded >= 0` |
| CHECK | `(status = 'completed') = (completed_at IS NOT NULL)` |
| CHECK | `(status = 'cancelled') = (cancelled_at IS NOT NULL)` |

## Indexes

| Index | Purpose |
|---|---|
| `(user_id, status)` | "what's the user working on / completed?" |
| `(user_id, completed_at DESC)` WHERE `completed_at IS NOT NULL` | user history of completed individual tasks |
| `(task_id, status)` | admin: "how many users completed task X?" |

## Rules

- One row per `(user, task)`. Created when user picks up the task (status = `in_progress`).
- **Auto-approve flow** (the only flow):
  1. User submits → SECURITY DEFINER function runs in a single transaction:
     - status = `'completed'`, `completed_at = now()`
     - snapshot `xp_awarded` / `points_awarded` from `individual_tasks`
     - INSERT `transactions` row, set `transaction_id`
     - INSERT trigger on `transactions` updates `user_balances.individual_exp` / `individual_points`
     - UPDATE `individual_journey.tasks_completed_count` for `(user, stage)`
     - Evaluate stage threshold + milestone unlocks; insert `individual_milestone_unlocks` if any
- **Cancellation:** user can abandon an in-progress task → status = `'cancelled'`, no reward. Re-picking up the task creates a fresh row only if the previous one is `cancelled` (delete the cancelled row first, or the UNIQUE constraint blocks the new pick).
- `xp_awarded` / `points_awarded` are **snapshotted** at completion. Future reward changes on `individual_tasks` don't retroactively alter completed rows.
- The XP/points cache update on `user_balances` happens via the `transactions` INSERT trigger — never directly from this table.

## What's intentionally NOT here

| Concern | Reason |
|---|---|
| `submitted` / `approved` / `rejected` statuses | Auto-approve — no review step exists. |
| `reviewer_user_id`, `review_feedback`, `reviewed_at` | No review step. |
| `submitted_at` | Same moment as `completed_at` — only one timestamp needed. |
| Peer review fields | Peer review is team-journey only. |
| `next_available_at` / `last_completed_at` | Individual tasks are one-shot. No cooldowns. |
| `team_id` | Individual journey only. |
