# `cohorts`

Groups of students that go through the program together. A cohort defines the timeline (when individual phase opens/closes, when team phase opens/closes) and acts as a scoping key for leaderboards and analytics.

Each `users.data` row belongs to exactly one cohort (admins excepted). Stages and tasks remain global templates by default — cohorts share them. If per-cohort overrides are ever needed, that's a future addition (e.g. `cohort_stage_overrides`); not in V2 scope.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `name` | text | NO | — | display name, e.g. "2026 Spring Cohort" |
| `slug` | text | NO | — | URL-safe, unique, e.g. `2026-spring` |
| `description` | text | YES | — | |
| `status` | enum `cohort_status` | NO | `'planned'` | `planned`, `active`, `completed`, `archived` |
| `started_on` | date | NO | — | program start date |
| `ends_on` | date | YES | — | program end (target) date |
| `individual_phase_starts_on` | date | YES | — | when individual journey opens for this cohort |
| `individual_phase_ends_on` | date | YES | — | when individual phase closes (transition window opens) |
| `team_phase_starts_on` | date | YES | — | when team formation / team journey opens |
| `team_phase_ends_on` | date | YES | — | program graduation target |
| `metadata` | jsonb | YES | — | overflow (e.g. cohort-specific settings, notes) |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `cohort_status` | `planned`, `active`, `completed`, `archived` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| UNIQUE | `slug` |
| CHECK | `length(slug) BETWEEN 3 AND 60` |
| CHECK | `slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'` |
| CHECK | `ends_on IS NULL OR ends_on >= started_on` |
| CHECK | `individual_phase_ends_on IS NULL OR individual_phase_starts_on IS NULL OR individual_phase_ends_on >= individual_phase_starts_on` |
| CHECK | `team_phase_ends_on IS NULL OR team_phase_starts_on IS NULL OR team_phase_ends_on >= team_phase_starts_on` |
| CHECK | `team_phase_starts_on IS NULL OR individual_phase_ends_on IS NULL OR team_phase_starts_on >= individual_phase_ends_on` |

## Indexes

| Index | Purpose |
|---|---|
| `(slug)` | already covered by UNIQUE |
| `(status, started_on DESC)` | "show active cohorts" |
| `(started_on DESC)` | admin listing |

## Rules

- **Admin-only writes.** Only admins create / update / archive cohorts.
- **Slug rules** match `teams.slug` — lowercase alphanumerics + hyphens, auto-generated on insert from `name`.
- **Phase dates are advisory** — they inform the UI ("team formation opens in 3 days") but the actual phase transition for an individual user is tracked on `users.data.phase`. Phase columns on cohorts let admins schedule, not enforce.
- **Status transitions:**
  - `planned` → `active` (on or after `started_on`, manual or scheduled)
  - `active` → `completed` (on or after `ends_on`, manual)
  - any → `archived` (admin)
- **Stages and tasks are shared** across all cohorts in V2. If a cohort needs different stages later, design a `cohort_stage_overrides` join table at that point — don't preemptively split.
- **Leaderboards filter by cohort.** A user only competes with their own cohort; cross-cohort comparisons are admin-only views.
- **A user's `cohort_id` is set at signup** (or invitation acceptance) and is essentially immutable. Admin can move a user between cohorts as a corrective action, but it's a deliberate operation, not user-initiated.

## RLS

| Operation | Policy |
|---|---|
| SELECT | all authenticated users can read `active` and `completed` cohorts (for context); admins read all |
| INSERT / UPDATE / DELETE | admins only |

## What's intentionally NOT here

| Concern | Where it lives |
|---|---|
| Per-cohort stage definitions | not modeled — stages are global. Add `cohort_stage_overrides` later if needed. |
| Per-cohort milestones | same |
| Cohort membership | `users.data.cohort_id` |
| Cohort-specific config (penalties, rewards) | `system_config` is global today; per-cohort tuning is out of scope for V2 |
