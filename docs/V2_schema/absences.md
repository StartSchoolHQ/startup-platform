# `absences`

Records of session non-attendance. One row per `(user, session)`. No penalty, no transactions — purely for user self-visibility and admin reporting (replaces a Google Sheet that n8n currently maintains).

Two flavors:
- **`excused`** — user pre-registered before the session. Counts against `users.data.absence_quota` (hard cap).
- **`unexcused`** — n8n detected a no-show after the session ended. Cannot be retroactively excused.

Sessions themselves are NOT mirrored in this DB — schedule lives in Google Calendar, fetched live by the app or n8n. Each absence row references the calendar event it pertains to via `calendar_event_id`.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE CASCADE |
| `type` | enum `absence_type` | NO | — | `excused` (pre-registered) / `unexcused` (no-show, n8n) |
| `absent_on` | date | NO | — | session date |
| `calendar_event_id` | text | NO | — | Google Calendar event id, e.g. `27gma7a93opt4t08gq5elaascj_20251007T060000Z` |
| `session_title` | text | NO | — | snapshot of calendar event title, e.g. "Standup squad 1/2/3" |
| `reason` | text | YES | — | optional, typically used for `excused` |
| `recorded_at` | timestamptz | NO | `now()` | when the row was written |
| `recorded_by_user_id` | uuid | YES | — | FK → `users.data(id)` SET NULL — user themselves for `excused`, NULL for `unexcused` (n8n) |
| `cancelled_at` | timestamptz | YES | — | set when user cancels their pre-registered absence; frees up quota |
| `metadata` | jsonb | YES | — | n8n overflow (sheet row id, source automation, etc.) |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `absence_type` | `excused`, `unexcused` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `user_id` → `users.data(id)` ON DELETE CASCADE |
| FOREIGN KEY | `recorded_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| UNIQUE | `(user_id, calendar_event_id)` — one absence row per user per session |
| CHECK | `(type = 'excused') OR (recorded_by_user_id IS NULL)` — `unexcused` rows are system-written, never user-attributed |
| CHECK | `(cancelled_at IS NULL) OR (type = 'excused')` — only excused absences can be cancelled |

## Indexes

| Index | Purpose |
|---|---|
| `(user_id, absent_on DESC)` | user's own attendance history |
| `(absent_on, type)` | admin "who was excused/absent on date X?" |
| `(calendar_event_id)` | reverse lookup from a calendar session |
| `(type, absent_on DESC)` | filter by type for dashboards |
| `(user_id, type) WHERE type = 'excused' AND cancelled_at IS NULL` | quota count — fast lookup of "active excused absences" per user |

## Quota — hard cap on pre-registration

| Rule | Detail |
|---|---|
| Source of truth for limit | `users.data.absence_quota` (default 3, admin-configurable per user) |
| Counted toward quota | `type = 'excused' AND cancelled_at IS NULL` |
| NOT counted | `type = 'unexcused'` (no-shows don't consume quota), cancelled excused absences |
| Enforced where | SECURITY DEFINER RPC `register_excused_absence` — counts active excused rows for the user, rejects if `>= absence_quota` |
| Cancellation behavior | `cancel_excused_absence` RPC sets `cancelled_at = now()`; quota frees up immediately |
| Retroactive excusing | **Not allowed.** Once an event has passed, the user cannot create or convert a row to `excused`. n8n's `unexcused` write is final from the user's perspective. |

## Write paths

| Scenario | Source | Row written |
|---|---|---|
| User pre-registers absence in app, before event | `register_excused_absence` RPC | `type = 'excused'`, `recorded_by_user_id = user`, `reason` optional, `recorded_at = now()` |
| Calendar session ends without user attending | n8n via service-role | `type = 'unexcused'`, `recorded_by_user_id = NULL`, `calendar_event_id` and `session_title` set |
| User cancels their pre-registration | `cancel_excused_absence` RPC | UPDATE existing row: `cancelled_at = now()` |
| Admin manual edit | direct via admin UI / RPC | as needed |

## Conflict handling (n8n vs. user)

If a user has `excused` for a session and n8n later tries to write `unexcused` for the same `(user_id, calendar_event_id)`, the UNIQUE constraint blocks the insert. n8n should check first and skip — the user's pre-registration takes precedence.

## RLS

| Operation | Policy |
|---|---|
| SELECT | user reads their own; admins read all |
| INSERT | user RPC for `excused` (with quota check); n8n via service role for `unexcused`; admins via service role |
| UPDATE | user can cancel their own `excused` (sets `cancelled_at`); admins can update any |
| DELETE | not exposed — full history preserved |

## Calendar integration (out of scope for this table)

Schedule comes from a specific Google Calendar that the platform has access to. Mandatory sessions are filtered by keyword matching on event titles. The app fetches calendar events at view time (or via cached n8n sync). When a user pre-registers, the UI passes the `calendar_event_id` and `session_title` from the fetched event into the RPC.

No `sessions` table is modeled in V2 — Calendar is the source of truth, this table only records *non-attendance*.

## What's intentionally NOT here

| Concern | Where it lives |
|---|---|
| Session schedule / metadata | Google Calendar |
| Presence (who attended) | not modeled — only absences are recorded |
| Penalty | none — no XP/points impact for missing sessions |
| Quota limit value | `users.data.absence_quota` |
