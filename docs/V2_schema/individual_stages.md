# `individual_stages`

Stage templates for the individual journey ("My Journey"). Global, admin-managed. One row per stage (e.g. Mindset, Skills, Ideas, Network, Ready).

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `slug` | text | NO | — | machine name: `mindset`, `skills`, `ideas`, `network`, `ready` |
| `name` | text | NO | — | display name |
| `description` | text | YES | — | short description shown in UI |
| `order_index` | int | NO | — | sequence (1, 2, 3, …) |
| `unlock_threshold_percent` | int | NO | `30` | % of this stage's tasks user must complete to unlock the next stage |
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

- Templates are **global** — same 5 (or however many) stages apply to every user.
- Admin-only writes. RLS allows all users to SELECT, only admins INSERT/UPDATE/DELETE.
- `order_index` is gap-allowed (1, 2, 3, 5) so admins can insert a new stage between existing ones without renumbering.
- `unlock_threshold_percent` controls progression: when a user's completed task count for this stage hits this threshold, the next stage unlocks.
- Deactivating a stage (`is_active = false`) does NOT cascade-delete user progress — historical journey state is preserved.
