# `team_stages`

Stage templates for the team journey. Global, admin-managed. Mirror of `individual_stages` but completely separate — team stages can differ in number, names, thresholds, and lifecycle from individual stages.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `slug` | text | NO | — | machine name, e.g. `formation`, `mvp`, `validation`, `launch`, `scale` |
| `name` | text | NO | — | display name |
| `description` | text | YES | — | short description shown in UI |
| `order_index` | int | NO | — | sequence (1, 2, 3, …) |
| `unlock_threshold_percent` | int | NO | `30` | % of this stage's tasks team must complete to unlock the next stage |
| `is_active` | bool | NO | `true` | soft-disable without deleting |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| UNIQUE | `slug` |
| UNIQUE | `order_index` |
| CHECK | `unlock_threshold_percent BETWEEN 1 AND 100` |
| CHECK | `order_index >= 1` |

## Indexes

| Index | Purpose |
|---|---|
| `(order_index)` | natural ordering for stage list rendering |

## Rules

- Templates are **global** — applied to every team.
- Admin-only writes. RLS allows all authenticated users to SELECT, only admins INSERT/UPDATE/DELETE.
- `order_index` is gap-allowed for inserts between existing stages.
- `unlock_threshold_percent` controls progression: when a team's completed (peer-review-approved) task count for this stage hits this threshold, the next stage unlocks.
- Deactivating a stage (`is_active = false`) preserves all team progress history.
- **Independent from `individual_stages`** — different table, different rows, different lifecycle. No `journey_type` enum coupling them.
