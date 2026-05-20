# `individual_milestones`

Bonus reward thresholds inside an individual stage. Global, admin-managed. Hangs off `individual_stages`. Multiple per stage allowed (e.g. 50%, 100%).

Distinct from the stage's `unlock_threshold_percent`:
- **`unlock_threshold_percent`** on the stage = the *gate* to advance.
- **Milestones** here = *carrots* — bonus XP/points at progress markers. Can sit above, below, or equal to the unlock threshold.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `stage_id` | uuid | NO | — | FK → `individual_stages(id)` ON DELETE CASCADE |
| `name` | text | NO | — | display name, e.g. "50% Mindset", "Mindset Complete" |
| `threshold_percent` | int | NO | — | 50, 100, etc. — % of stage tasks completed |
| `xp_reward` | int | NO | `0` | XP granted when user crosses this threshold |
| `points_reward` | int | NO | `0` | points granted when user crosses this threshold |
| `is_active` | bool | NO | `true` | soft-disable without deleting |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `stage_id` → `individual_stages(id)` ON DELETE CASCADE |
| UNIQUE | `(stage_id, threshold_percent)` |
| CHECK | `threshold_percent BETWEEN 1 AND 100` |
| CHECK | `xp_reward >= 0` |
| CHECK | `points_reward >= 0` |

## Indexes

| Index | Purpose |
|---|---|
| `(stage_id, threshold_percent)` | natural ordering inside a stage |

## Rules

- Admin-only writes. RLS allows all users to SELECT, only admins INSERT/UPDATE/DELETE.
- A user only earns the milestone reward **once** — tracked in `individual_milestone_unlocks` with a UNIQUE `(user_id, milestone_id)`.
- Updating a milestone's reward AFTER users have unlocked it does NOT retroactively change their `transactions` row (the ledger is immutable).
- Deactivating a milestone (`is_active = false`) prevents future unlocks but preserves history.
