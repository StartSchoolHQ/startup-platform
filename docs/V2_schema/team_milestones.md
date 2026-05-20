# `team_milestones`

Bonus reward thresholds inside a team stage. Global, admin-managed. Hangs off `team_stages`. Mirror of `individual_milestones`.

When a team crosses a milestone, **each currently-active team member** receives the reward (one `transactions` row per member). The unlock event itself is recorded once on `team_milestone_unlocks`.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `stage_id` | uuid | NO | — | FK → `team_stages(id)` ON DELETE CASCADE |
| `name` | text | NO | — | display name, e.g. "50% MVP", "MVP Complete" |
| `threshold_percent` | int | NO | — | 50, 100, etc. |
| `xp_reward_per_member` | int | NO | `0` | XP each active team member receives |
| `points_reward_per_member` | int | NO | `0` | points each active team member receives |
| `is_active` | bool | NO | `true` | soft-disable without deleting |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `stage_id` → `team_stages(id)` ON DELETE CASCADE |
| UNIQUE | `(stage_id, threshold_percent)` |
| CHECK | `threshold_percent BETWEEN 1 AND 100` |
| CHECK | `xp_reward_per_member >= 0` |
| CHECK | `points_reward_per_member >= 0` |

## Indexes

| Index | Purpose |
|---|---|
| `(stage_id, threshold_percent)` | natural ordering inside a stage |

## Rules

- Admin-only writes. All authenticated users can SELECT.
- Reward fields are **per-member** to make the math explicit. A 5-member team crossing a 100 XP milestone results in 5 transactions of 100 XP each.
- A team only earns the milestone reward **once** — tracked in `team_milestone_unlocks` with UNIQUE `(team_id, milestone_id)`.
- Updating reward values after teams have already unlocked the milestone does NOT retroactively change existing `transactions` rows.
- Members who join the team **after** a milestone was unlocked do NOT get a retroactive payout.
- Members who left the team before unlock are not paid.
- Deactivating a milestone (`is_active = false`) prevents future unlocks but preserves history.
