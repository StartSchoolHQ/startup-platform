# `teams`

The team entity. Lean — only stable team-level identity, lifecycle, and a couple of business-rule fields. No denormalized counters: member count, strike count, and team XP/points totals are all derived from their source tables.

XP and points are owned by the **user**, not the team. Team membership is a place to earn rewards; when a member leaves, they take their `team_exp` and `team_points` (cached on `user_balances`) with them. A "team total" for the leaderboard is computed live as `SUM(user_balances.team_exp WHERE user_id IN active members)` — purely cosmetic.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `name` | text | NO | — | display name |
| `slug` | text | NO | — | URL-safe identifier, unique. Auto-generated from `name` on insert with `-2` / `-3` collision suffix. |
| `description` | text | YES | — | |
| `logo_url` | text | YES | — | |
| `website` | text | YES | — | |
| `founder_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE RESTRICT |
| `cohort_id` | uuid | NO | — | FK → `cohorts(id)` ON DELETE RESTRICT — every team belongs to exactly one cohort, snapshotted from founder's cohort at creation |
| `status` | enum `team_status` | NO | `'active'` | `active`, `archived`, `disabled` |
| `formation_cost` | int | NO | `0` | snapshot of points paid to form this team — kept per row so changing the global cost later does not rewrite history |
| `current_week` | int | NO | `0` | per-team week counter; advances by weekly cron, drives weekly-report cadence |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |
| `archived_at` | timestamptz | YES | — | set when status transitions to `archived` |

## Enums

| Enum | Values |
|---|---|
| `team_status` | `active`, `archived`, `disabled` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `founder_id` → `users.data(id)` ON DELETE RESTRICT |
| FOREIGN KEY | `cohort_id` → `cohorts(id)` ON DELETE RESTRICT |
| UNIQUE | `slug` |
| ENFORCED via trigger | every `team_members` row's `user_id` MUST have matching `users.data.cohort_id = teams.cohort_id` — no cross-cohort teams |
| CHECK | `formation_cost >= 0` |
| CHECK | `current_week >= 0` |
| CHECK | `(status = 'archived') = (archived_at IS NOT NULL)` |
| CHECK | `length(slug) BETWEEN 3 AND 60` |
| CHECK | `slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'` — lowercase alphanumerics with single hyphens |

## Indexes

| Index | Purpose |
|---|---|
| `(slug)` | unique already covers it — slug-based lookups for `/teams/<slug>` |
| `(founder_id)` | "what teams did this user found?" |
| `(cohort_id, status)` | per-cohort active team listing |
| `(status)` | active-team listing for admin / leaderboard |
| `(created_at DESC)` | recent teams |

## Rules

- **Lean identity row.** No counters, no cached totals — everything derivable lives in its source table.
- **`founder_id` is RESTRICT** — admins cannot hard-delete a user who still founded teams. Force lifecycle action (transfer or archive) first.
- **Slug rules:**
  - Auto-generated on insert by lowercasing `name`, replacing non-alphanumerics with hyphens, collapsing repeats, trimming, then appending `-2` / `-3` / … on UNIQUE collision.
  - Mutable later (e.g. team rename) but old slugs are NOT preserved as redirects in this table — that's a UI/router concern.
- **`formation_cost`** is a **snapshot** of the global cost at team-creation time. Changing the global cost later doesn't retroactively alter existing teams.
- **`current_week`** advances by a weekly cron job. Used by the weekly-report flow to determine which week's report is due. A team formed on week 1 starts at `current_week = 1`; weekly cron increments by 1.
- **Archiving** is reversible (admin can flip `status` back to `active`); deletion is not exposed.
- **`cohort_id`** is set at team creation from the founder's `users.data.cohort_id` and is immutable. All members must belong to the same cohort — enforced when accepting invitations.

## What's intentionally NOT here

| Concern | Lives in |
|---|---|
| Member count | `team_members` (count where `left_at IS NULL`) |
| Strike count | `team_strikes` |
| Team XP / points totals (leaderboard) | computed: `SUM(user_balances.team_exp / team_points WHERE user_id IN active members)` |
| Weekly maintenance cost | dropped — V2 has no recurring team fee |
| Stage progression | `team_journey` (per `(team, stage)` row) |
| Member roles | `team_members.team_role` |
| Team task progress | `team_task_progress` (one row per `(team, task)`) |

## RLS

| Operation | Policy |
|---|---|
| SELECT | all authenticated users can read active teams (for leaderboard / discovery) |
| INSERT | only via SECURITY DEFINER `create_team` RPC (handles slug generation + founder transaction) |
| UPDATE | founder can update own team (name, description, logo, website); admins can update any |
| DELETE | not exposed — use status transitions |
