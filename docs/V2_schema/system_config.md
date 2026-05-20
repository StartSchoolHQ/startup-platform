# `system_config`

Singleton-ish key-value store for global runtime configuration. Holds tunable values that policy / cron jobs / RPCs read at runtime — penalties, defaults, thresholds. Avoids hardcoding business rules in code or schema.

Each row is one config entry. Values are typed loosely as JSON to allow ints, floats, strings, or small structured objects.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `key` | text | NO | — | PK; stable machine name (e.g. `weekly_report_penalty_xp`) |
| `value` | jsonb | NO | — | typed value; JSON to support int / float / string / object |
| `description` | text | YES | — | what it controls, for admin UI |
| `value_type` | enum `config_value_type` | NO | — | `int`, `float`, `string`, `json` — for admin form rendering and validation |
| `updated_by_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL — last admin who changed it |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `config_value_type` | `int`, `float`, `string`, `json` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `key` |
| FOREIGN KEY | `updated_by_user_id` → `users.data(id)` ON DELETE SET NULL |

## Seed values (initial)

| Key | Value type | Initial value | Used by |
|---|---|---|---|
| `weekly_report_penalty_xp` | int | `-50` | weekly_reports miss cron |
| `weekly_report_penalty_points` | int | `-100` | weekly_reports miss cron |
| `team_formation_cost` | int | `500` | `create_team` RPC (snapshotted on `teams.formation_cost`) |
| `default_absence_quota` | int | `3` | seeded into `users.data.absence_quota` on signup |
| `peer_review_default_due_hours` | int | `72` | default for `team_tasks.peer_review_due_hours` (admins can override per task) |
| `invitation_expiry_days` | int | `7` | `team_invitations.expires_at` computation |
| `client_meeting_xp_per_member` | int | (TBD) | `client_meetings` reward on approval |
| `client_meeting_points_per_member` | int | (TBD) | same |

Add new keys via migration when new policy levers are needed.

## Rules

- **Singleton table** — one row per `key`, no per-team or per-user variants. For per-user overrides (e.g. custom `absence_quota`), use the column on `users.data` directly; this table holds defaults only.
- **Snapshot pattern:** values are NOT retroactively applied. When a config value drives a row's behavior (penalty amount, formation cost, etc.), the consuming RPC reads the current value at write time and the resulting row (`transactions`, `teams`, etc.) keeps its own snapshot. Future config changes don't rewrite history.
- **Updates always recorded:** `updated_by_user_id` and `updated_at` capture the change author and time. For full diff history rely on `audit_log`.
- **Reads are unrestricted to admins** but RLS hides this table from regular users — they shouldn't see internal policy tuning.

## RLS

| Operation | Policy |
|---|---|
| SELECT | admins only |
| INSERT / UPDATE / DELETE | admins only |
| Service role | full access (used by cron RPCs that read penalty values etc.) |
