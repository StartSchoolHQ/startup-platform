# `individual_milestone_unlocks`

Per-user record of milestone unlocks in the individual journey. One row when a user first crosses a milestone threshold. Prevents double-paying via UNIQUE `(user_id, milestone_id)`.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE CASCADE |
| `milestone_id` | uuid | NO | — | FK → `individual_milestones(id)` ON DELETE RESTRICT |
| `transaction_id` | uuid | YES | — | FK → `transactions(id)` ON DELETE SET NULL — the reward row created at unlock |
| `unlocked_at` | timestamptz | NO | `now()` | |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `user_id` → `users.data(id)` ON DELETE CASCADE |
| FOREIGN KEY | `milestone_id` → `individual_milestones(id)` ON DELETE RESTRICT |
| FOREIGN KEY | `transaction_id` → `transactions(id)` ON DELETE SET NULL |
| UNIQUE | `(user_id, milestone_id)` — prevents double-paying |

## Indexes

| Index | Purpose |
|---|---|
| `(user_id, unlocked_at DESC)` | user milestone history |
| `(milestone_id)` | admin: "how many users hit this milestone?" |

## Rules

- Inserted **once** per user per milestone, by the SECURITY DEFINER function called from the task-approval trigger when `individual_journey.progress_percent` first reaches a milestone's `threshold_percent`.
- The same function inserts the corresponding `transactions` row for the bonus XP/points and stores its id in `transaction_id`.
- `milestone_id` is RESTRICT — admins must deactivate (`is_active = false` on `individual_milestones`), not delete, to preserve user history.
- If a milestone's `threshold_percent` is later changed, **already-unlocked users keep their unlock**. The transaction is immutable, the unlock row is permanent.
- Reading "milestones earned in stage X" = JOIN through `individual_milestones` filtered by `stage_id`.

## Visual mapping

| UI element | Source |
|---|---|
| `2/4 milestones` for the current stage | `COUNT(individual_milestone_unlocks)` for active milestones of the stage / `COUNT(individual_milestones WHERE is_active)` |
| Milestone toast / notification | row INSERT triggers a `notifications` row (handled separately) |
