# `team_task_reviews`

First-class entity for reviewing a team task submission. **Team-journey only** — individual tasks auto-approve and don't use this table. Tracks assignment, decision, feedback, and (for peer reviewers only) the reward transaction.

Two flavors of reviewer:
- **`peer`** — a non-team-member user who reviews `standard` task submissions. Earns XP/points.
- **`admin`** — an admin who reviews `confidential` task submissions. Earns nothing (admin work, not gamified).

Renamed from `peer_reviews` because the table now covers both peer and admin reviews.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `team_task_progress_id` | uuid | NO | — | FK → `team_task_progress(id)` ON DELETE CASCADE — the submission being reviewed |
| `reviewer_user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE RESTRICT |
| `reviewer_role` | enum `reviewer_role` | NO | — | `peer` or `admin` — set at assign time based on `team_tasks.task_type` |
| `submission_attempt` | int | NO | `1` | mirrors `team_task_progress.submission_attempt` — increments on each rejection + resubmit cycle |
| `status` | enum `team_task_review_status` | NO | `'pending'` | see enum |
| `decision` | enum `team_task_review_decision` | YES | — | set on completion (`approved` / `rejected`) |
| `feedback` | text | YES | — | reviewer's written feedback |
| `criteria_scores` | jsonb | YES | — | rubric scores per criterion (matches `team_tasks.peer_review_criteria` shape) |
| `assigned_at` | timestamptz | NO | `now()` | when review was assigned/claimed |
| `due_at` | timestamptz | NO | — | computed at assign time: `assigned_at + team_tasks.peer_review_due_hours` |
| `completed_at` | timestamptz | YES | — | when reviewer submitted decision |
| `expired_at` | timestamptz | YES | — | when system marked it expired (passed `due_at` without decision) |
| `xp_awarded` | int | YES | — | snapshotted at completion. NULL for admin reviews. |
| `points_awarded` | int | YES | — | snapshotted at completion. NULL for admin reviews. |
| `transaction_id` | uuid | YES | — | FK → `transactions(id)` ON DELETE SET NULL — reviewer's reward row. NULL for admin reviews. |
| `metadata` | jsonb | YES | — | overflow |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `reviewer_role` | `peer`, `admin` |
| `team_task_review_status` | `pending`, `completed`, `expired`, `cancelled` |
| `team_task_review_decision` | `approved`, `rejected` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `team_task_progress_id` → `team_task_progress(id)` ON DELETE CASCADE |
| FOREIGN KEY | `reviewer_user_id` → `users.data(id)` ON DELETE RESTRICT |
| FOREIGN KEY | `transaction_id` → `transactions(id)` ON DELETE SET NULL |
| UNIQUE | `(team_task_progress_id, submission_attempt, reviewer_user_id)` — one reviewer per round |
| CHECK | `(status = 'completed') = (completed_at IS NOT NULL AND decision IS NOT NULL)` |
| CHECK | `(status = 'expired') = (expired_at IS NOT NULL)` |
| CHECK | `due_at > assigned_at` |
| CHECK | `xp_awarded IS NULL OR xp_awarded >= 0` |
| CHECK | `points_awarded IS NULL OR points_awarded >= 0` |
| CHECK | `submission_attempt >= 1` |
| CHECK | `reviewer_role = 'admin' OR transaction_id IS NULL OR status = 'completed'` — peer rewards only on completion |
| CHECK | `reviewer_role = 'peer' OR (xp_awarded IS NULL AND points_awarded IS NULL AND transaction_id IS NULL)` — admin reviews never have rewards |
| ENFORCED via trigger | when `reviewer_role = 'peer'`, `reviewer_user_id` MUST NOT be a current member of the submitting team — checked at INSERT time |
| ENFORCED via trigger | **TOCTOU defense**: trigger on `team_members` AFTER INSERT — if the new member has any `pending` `team_task_reviews` row whose underlying `team_task_progress.team_id = NEW.team_id`, that review row is flipped to `cancelled` and `assign_team_task_review` is re-run for a fresh reviewer |
| ENFORCED via trigger | the `accept_invitation` RPC also pre-checks: refuses if invitee has any `pending` peer review against the inviting team. Belt and braces. |
| ENFORCED via trigger | when `reviewer_role = 'admin'`, `reviewer_user_id` MUST have `users.data.primary_role = 'admin'` |
| CHECK | `pg_column_size(criteria_scores) < 4096` |
| CHECK | `pg_column_size(metadata) < 16384` — 16 KB hard limit |
| CHECK | `feedback IS NULL OR length(feedback) <= 5000` |

## Indexes

| Index | Purpose |
|---|---|
| `(reviewer_user_id, status)` | "what's assigned to me?" |
| `(reviewer_user_id, completed_at DESC)` WHERE `status = 'completed'` | reviewer's history |
| `(team_task_progress_id, submission_attempt DESC)` | submission's full review history across rounds |
| `(status, due_at)` WHERE `status = 'pending'` | overdue / expiry sweep |
| `(status, reviewer_role)` WHERE `status = 'pending'` | open queue, splittable by peer vs admin |

## Rules

### Assignment

| `team_tasks.task_type` | `reviewer_role` | Eligible reviewers |
|---|---|---|
| `standard` | `peer` | active team-journey users who are NOT members of the submitting team |
| `confidential` | `admin` | users with `primary_role = 'admin'` |

Assignment is one reviewer per submission attempt. Multi-reviewer (e.g. require 2 of 3 peer approvals) is supported by the schema but not by initial assign/decision logic — add later without migration.

### Submission attempt cap (anti-collusion)

A `team_task_progress.submission_attempt > 3` triggers automatic escalation: the next review is created with `reviewer_role = 'admin'` regardless of `team_tasks.task_type`. The `submit_team_task_review` RPC raises `submission_attempt_cap_exceeded` if a peer reviewer attempts a 4th-round rejection. The `escalate_to_admin_review` internal RPC takes over.

**Why:** without this cap, a colluding reviewer/submitter pair can farm peer-review XP indefinitely via reject-resubmit cycles. Three rounds is the practical limit for legitimate revision feedback; beyond that, admin oversight is the right call regardless.

### Resubmission — same reviewer stays in the loop

When a review rejects and the team resubmits with fixes:

1. `team_task_progress.status` flips back to `in_progress`, `submission_attempt` increments
2. Team makes fixes, submits again → `status = 'submitted'`
3. Assign function creates a **new `team_task_reviews` row** with:
   - same `reviewer_user_id` as the previous round (peer reviewers stay in the loop because they have the context)
   - same `reviewer_role`
   - new `submission_attempt` (matches the parent's)
4. If the original peer reviewer is unavailable (left platform, account disabled), assign function falls back to a fresh non-team-member.
5. Admin reviewers on confidential tasks: same logic — same admin if available, fallback otherwise.

### Decision flow

1. Reviewer submits decision → SECURITY DEFINER function:
   - status = `completed`, set `decision`, `feedback`, `criteria_scores`, `completed_at`
   - **If `reviewer_role = 'peer'`:** snapshot `xp_awarded` / `points_awarded` from `team_tasks.peer_review_xp_reward` / `peer_review_points_reward`, INSERT `transactions` row (context = `team`, type = `peer_review_completed`), set `transaction_id`. Reviewer earns the reward whether they approve OR reject — completing the review is the work.
   - **If `reviewer_role = 'admin'`:** no reward, no transaction.
   - If `decision = 'approved'`: trigger team task approval flow (per-member payouts, journey/milestone evaluation — see `team_task_progress.md`)
   - If `decision = 'rejected'`: set `team_task_progress.status = 'rejected'`. Team can resubmit; new review row created on next submission with the same reviewer (see above).

### Expiry & cancellation

- **Expiry:** background job marks `pending` reviews past `due_at` as `expired`. Reviewer earns nothing. Submission goes back to the queue; a new reviewer is assigned (new row).
- **Cancellation:** if the team cancels the underlying task submission, the active row is marked `cancelled`. No reward.
- The reviewer's XP/points cache update on `user_balances` happens via the `transactions` INSERT trigger (peer review counts toward `team_exp` / `team_points`).

## Why this is its own table (not columns on `team_task_progress`)

| Concern | If on `team_task_progress` | As own table |
|---|---|---|
| Multiple reviewers per submission | impossible without arrays | trivial — N rows |
| Multiple review rounds (resubmissions) | overwrite or jsonb | full history, one row per round |
| Reviewer's history independent of submission lifecycle | tangled | clean — query by `reviewer_user_id` |
| Per-criterion rubric scoring | jsonb shoved into parent | first-class column |
| Reviewer reward linkage | parent row also holds team payouts → confusing | one `transaction_id` per peer review |
| Admin vs peer review semantics | conditional everywhere | clean enum split |
