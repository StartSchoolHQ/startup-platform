# `team_task_progress`

Per-team state for a team task attempt. Lifecycle: `in_progress` → `submitted` → `in_review` → `approved` / `rejected`. Approval requires peer (or admin, for confidential tasks) review; on approval, every currently-active team member gets a `transactions` row.

**One active row per `(team, task)`.** For non-recurring tasks, that's also the lifetime cap. For **recurring** tasks (`team_tasks.is_recurring = true`), once a row is `approved` and `cooldown_days` have elapsed, the team can pick the task again — a new row is inserted. All historical attempts are preserved.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `team_id` | uuid | NO | — | FK → `teams(id)` ON DELETE CASCADE |
| `task_id` | uuid | NO | — | FK → `team_tasks(id)` ON DELETE RESTRICT |
| `status` | enum `team_task_status` | NO | `'in_progress'` | see enum |
| `picked_up_by_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL — first member to start the task |
| `submitted_by_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL — member who submitted |
| `started_at` | timestamptz | NO | `now()` | when team picked up the task |
| `submitted_at` | timestamptz | YES | — | when submission was made |
| `review_started_at` | timestamptz | YES | — | when a reviewer was assigned/claimed |
| `completed_at` | timestamptz | YES | — | when peer review approved |
| `cancelled_at` | timestamptz | YES | — | when team abandoned the task |
| `submission_data` | jsonb | YES | — | structured form fields |
| `submission_url` | text | YES | — | optional single URL submission |
| `submission_notes` | text | YES | — | freeform notes |
| `submission_attempt` | int | NO | `1` | increments on each resubmission after rejection within the SAME attempt |
| `next_available_at` | timestamptz | YES | — | for recurring tasks: when the team can pick this task again. Set on approval as `completed_at + cooldown_days`. NULL for non-recurring or non-approved rows. |
| `xp_awarded_per_member` | int | YES | — | snapshotted at completion |
| `points_awarded_per_member` | int | YES | — | snapshotted at completion |
| `metadata` | jsonb | YES | — | overflow (submission_history, review_history, etc.) |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `team_task_status` | `in_progress`, `submitted`, `in_review`, `approved`, `rejected`, `cancelled` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `team_id` → `teams(id)` ON DELETE CASCADE |
| FOREIGN KEY | `task_id` → `team_tasks(id)` ON DELETE RESTRICT |
| FOREIGN KEY | `picked_up_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| FOREIGN KEY | `submitted_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| UNIQUE (partial) | `(team_id, task_id) WHERE status IN ('in_progress', 'submitted', 'in_review')` — only one **active** attempt per `(team, task)`. Past `approved` / `rejected` / `cancelled` rows allowed (history + recurring re-attempts). |
| CHECK | `xp_awarded_per_member IS NULL OR xp_awarded_per_member >= 0` |
| CHECK | `points_awarded_per_member IS NULL OR points_awarded_per_member >= 0` |
| CHECK | `(status = 'approved') = (completed_at IS NOT NULL)` |
| CHECK | `(status = 'cancelled') = (cancelled_at IS NOT NULL)` |
| CHECK | `submission_attempt >= 1` |
| CHECK | `submission_attempt <= 4` — at attempt 4, the row is forced into `reviewer_role='admin'` review via `escalate_to_admin_review`. The schema permits the 4th attempt to exist; the policy ensures it can only be admin-reviewed. Beyond 4, `submit_team_task_review` raises `submission_attempt_cap_exceeded`. |
| CHECK | `status NOT IN ('submitted','in_review','approved','rejected') OR submitted_at IS NOT NULL` |
| CHECK | `pg_column_size(submission_data) < 65536` — 64 KB hard limit on submission jsonb |
| CHECK | `pg_column_size(metadata) < 32768` — 32 KB hard limit; prevents adversarial accumulation across resubmission rounds |
| CHECK | `submission_notes IS NULL OR length(submission_notes) <= 5000` |
| Trigger | non-recurring tasks: cannot insert a NEW row when an `approved` row already exists for the same `(team_id, task_id) AND team_tasks.is_recurring = false` |

## Indexes

| Index | Purpose |
|---|---|
| `(team_id, status)` | "what's the team working on / waiting on / completed?" |
| `(team_id, completed_at DESC)` WHERE `completed_at IS NOT NULL` | team history |
| `(picked_up_by_user_id) WHERE status IN ('in_progress','submitted','in_review')` | "tasks I'm working on" across all teams I've ever been in |
| `(submitted_by_user_id, submitted_at DESC) WHERE submitted_at IS NOT NULL` | "what I submitted" |
| `(task_id, status)` | admin: "how many teams completed task X?" |
| `(status)` WHERE `status = 'submitted'` | unassigned peer-review queue |
| `(status, review_started_at)` WHERE `status = 'in_review'` | overdue reviews |

## Rules

- One row per `(team, task)`. Created when the first member picks up the task.
- **Lifecycle:**
  1. Member picks up → row created, `status = in_progress`, `picked_up_by_user_id` set
  2. Member submits → `status = submitted`, `submitted_at` and `submitted_by_user_id` set
  3. Reviewer assigned (peer for `standard` task, admin for `confidential`) → `status = in_review`, `review_started_at` set, `team_task_reviews` row created
  4. Reviewer approves → SECURITY DEFINER function:
     - `status = approved`, `completed_at = now()`
     - snapshot `xp_awarded_per_member` / `points_awarded_per_member` from `team_tasks`
     - INSERT one `transactions` row per active `team_members` row (context = `team`, team_id set, source = this row)
     - If reviewer was `peer`: INSERT one `transactions` row for the reviewer (context = `team`, type = `peer_review_completed`, source = the `team_task_reviews` row). Admin reviewers get no transaction.
     - UPDATE `team_journey.tasks_completed_count` ONLY when this is the first `approved` row for the `(team_id, task_id)` pair — DISTINCT count, applies to both recurring and non-recurring tasks. Repeated recurring completions still fan out rewards but do not double-count stage progress.
     - Evaluate stage threshold + milestone unlocks
  5. Reviewer rejects → `status = rejected`, no team rewards (peer reviewer still gets paid for the review work itself). Team can resubmit (back to `in_progress`, `submission_attempt` increments). On resubmit, the **same reviewer** is reassigned via a new `team_task_reviews` row (they have the context).
- **Active member rule:** payouts go to members where `team_members.left_at IS NULL` at the moment of approval. Members who joined later don't backfill; members who left don't get paid.
- **Cancellation:** team can abandon an in-progress task → `status = cancelled`. Re-picking creates a fresh attempt only if the cancelled row is removed first.
- `xp_awarded_per_member` / `points_awarded_per_member` are snapshots — future template changes don't alter completed rows.
- The XP/points cache update on `user_balances` happens via the `transactions` INSERT trigger.
- **Recurring tasks** (when `team_tasks.is_recurring = true`):
  - On approval, `next_available_at = completed_at + (team_tasks.cooldown_days * interval '1 day')`.
  - The buffet UI must filter out tasks where the most recent `(team, task)` row is `approved` AND `next_available_at > now()`.
  - Once `next_available_at` passes, picking the task creates a NEW row (not an update). All historical attempts persist.
  - **Stage progress counts each task once.** `team_journey.tasks_completed_count` increments only when a `(team, task)` pair is approved for the first time. Subsequent recurring completions still fan out rewards but do not double-count toward stage progress.

## What's intentionally NOT here

| Concern | Reason |
|---|---|
| Reviewer fields | Lives in `team_task_reviews` (1:N relation — supports multiple rounds and future multi-reviewer model). |
| Per-member award detail | Already implicit: one `transactions` row per active member at approval. |
| `user_id` | Team tasks are owned by the team, not a single user. Submission attribution is `submitted_by_user_id`. |
