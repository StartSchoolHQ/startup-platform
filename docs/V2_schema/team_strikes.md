# `team_strikes`

Strikes issued against a team for policy violations or repeated infractions. Each strike is an event with a reason, severity, and issuing admin. **Not a counter on `teams`** — each row is a first-class record. Active-strike count for the leaderboard is derived live.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `team_id` | uuid | NO | — | FK → `teams(id)` ON DELETE CASCADE |
| `severity` | enum `strike_severity` | NO | `'minor'` | `minor`, `major`, `critical` |
| `reason_category` | enum `strike_reason_category` | NO | — | enum-classified reason for filtering / dashboards |
| `reason_detail` | text | YES | — | freeform admin explanation |
| `issued_by_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL — admin who issued |
| `expires_at` | timestamptz | YES | — | when the strike stops counting toward "active strikes" (NULL = permanent) |
| `revoked_at` | timestamptz | YES | — | admin reversed the strike |
| `revoked_by_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL |
| `revoked_reason` | text | YES | — | |
| `source_table` | enum `entity_source_table` | YES | — | typed polymorphic source for the triggering event (e.g. `weekly_reports` row that prompted the strike). Shared with `notifications` / `activity_events` / `support_tickets`. |
| `source_id` | uuid | YES | — | the row that triggered the strike |
| `metadata` | jsonb | YES | — | overflow (additional context beyond source) |
| `issued_at` | timestamptz | NO | `now()` | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `strike_severity` | `minor`, `major`, `critical` |
| `strike_reason_category` | `weekly_report_chronic_miss`, `inactivity`, `policy_violation`, `peer_review_abuse`, `manual` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `team_id` → `teams(id)` ON DELETE CASCADE |
| FOREIGN KEY | `issued_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| FOREIGN KEY | `revoked_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| CHECK | `(revoked_at IS NULL) = (revoked_by_user_id IS NULL AND revoked_reason IS NULL)` — all-or-nothing on revocation fields |
| CHECK | `expires_at IS NULL OR expires_at > issued_at` |

## Indexes

| Index | Purpose |
|---|---|
| `(team_id, issued_at DESC)` | full strike history for a team |
| `(team_id, expires_at) WHERE revoked_at IS NULL` | "active strikes" — the `expires_at IS NULL OR expires_at > now()` filter is applied at query time. This index covers the common shape. |
| `(team_id, severity)` | dashboard breakdown |
| `(reason_category, issued_at DESC)` | trends by category |

## Rules

- **Append-only.** Never DELETE. Use `revoked_at` to neutralize a strike.
- **Active strike** = `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`. Use a SQL view if you query this often (recommended: `team_strikes_active`).
- **No automatic XP / points penalty** issued by this table — strikes are reputational. If policy says "3 strikes → archive team", that's enforced in an admin RPC, not via DB trigger.
- **Issuing a strike** also writes:
  - one `activity_events` row of type `team_strike_issued` for each active team member (so it appears on their timelines)
  - one `notifications` row per active team member (priority `high`)
- **Revocation** writes a corresponding `activity_events` and notification (similar fan-out).
- **Triggering source** (e.g., the weekly_reports row that prompted a strike) lives in the typed `source_table` + `source_id` columns. Same polymorphic pattern used everywhere else in V2.

## RLS

| Operation | Policy |
|---|---|
| SELECT | team members can read their own team's strikes; admins read all |
| INSERT / UPDATE | only via SECURITY DEFINER admin RPCs (`issue_strike`, `revoke_strike`) |
| DELETE | not exposed |

## What's intentionally NOT here

| Concern | Why |
|---|---|
| Counter on `teams` | Drift trap — derived from this table |
| Per-strike XP penalty | Strikes are reputational. If a penalty is needed, write a separate `transactions` row of type `admin_adjustment` and link via `metadata.related_strike_id`. |
| User-level strikes | Not modeled — strikes are team-level only in V2. |
