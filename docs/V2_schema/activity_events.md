# `activity_events`

User-facing timeline of meaningful actions in the platform. Distinct from `transactions` (the XP/points ledger) and `audit_log` (DB-row diffs).

**Partitioned by month on `occurred_at`** — see [partitioning.md](partitioning.md). Retention policy: see [retention.md](retention.md).

| Concern | Table |
|---|---|
| XP / points changes (financial-style ledger) | `transactions` |
| User-visible "what I did" timeline | **`activity_events`** |
| Row-level DB diffs (admin / debug) | `audit_log` |

A single user action can produce all three: e.g. "Task approved" → 1 `activity_events` row + 1 `transactions` row + 1 `audit_log` row (linked).

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE CASCADE — whose timeline this lands on |
| `team_id` | uuid | YES | — | FK → `teams(id)` ON DELETE SET NULL — when the event is team-context |
| `actor_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL — who caused it (NULL = system, e.g. cron) |
| `category` | enum `activity_category` | NO | — | high-level grouping for filters |
| `type` | enum `activity_type` | NO | — | specific event |
| `context` | enum `journey_context` | NO | — | `individual` / `team` (shared with `transactions`) |
| `cohort_id` | uuid | YES | — | FK → `cohorts(id)` ON DELETE RESTRICT — denormalized snapshot from `users.data.cohort_id` at insert time. Lets cohort archival skip joining. NULL only for events on admin users. |
| `source_table` | enum `entity_source_table` | YES | — | typed polymorphic deep-link. Shared enum with `notifications`, `support_tickets`, `team_strikes` — broader than the reward-only `reward_source_table` used by `transactions`. |
| `source_id` | uuid | YES | — | row that triggered the event |
| `transaction_id` | uuid | YES | — | FK → `transactions(id)` ON DELETE SET NULL — set when the event also produced a reward |
| `summary` | text | NO | — | short human-readable line for the timeline UI |
| `metadata` | jsonb | YES | — | overflow (xp_amount, milestone_name, week_number, etc.) |
| `occurred_at` | timestamptz | NO | `now()` | when the action happened (may differ from `created_at` if backfilled) |
| `created_at` | timestamptz | NO | `now()` | row insert time |

## Enums

| Enum | Values |
|---|---|
| `activity_category` | `task`, `peer_review`, `journey`, `weekly_report`, `team`, `invitation`, `meeting`, `revenue`, `system` |
| `activity_type` | (see mapping below) |
| `journey_context` | shared with `transactions`: `individual`, `team` |

### `activity_type` ↔ `activity_category`

| Category | Types |
|---|---|
| `task` | `task_started`, `task_submitted`, `task_completed`, `task_cancelled`, `task_assigned` |
| `peer_review` | `peer_review_assigned`, `peer_review_submitted`, `peer_review_expired`, `team_task_approved`, `team_task_rejected` |
| `journey` | `stage_unlocked`, `stage_completed`, `milestone_unlocked` |
| `weekly_report` | `weekly_report_submitted`, `weekly_report_missed`, `weekly_report_refunded` |
| `team` | `team_created`, `team_member_joined`, `team_member_left`, `team_role_changed`, `team_archived`, `team_strike_issued` |
| `invitation` | `invitation_sent`, `invitation_received`, `invitation_accepted`, `invitation_declined` |
| `meeting` | `client_meeting_logged`, `client_meeting_approved`, `client_meeting_rejected` |
| `revenue` | `revenue_submitted`, `revenue_approved`, `revenue_rejected` |
| `system` | `xp_adjustment`, `account_status_change` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `user_id` → `users.data(id)` ON DELETE CASCADE |
| FOREIGN KEY | `team_id` → `teams(id)` ON DELETE SET NULL |
| FOREIGN KEY | `actor_user_id` → `users.data(id)` ON DELETE SET NULL |
| FOREIGN KEY | `transaction_id` → `transactions(id, created_at)` ON DELETE SET NULL — composite (partitioned table). In practice often left as a soft reference (uuid only) to avoid the cross-partition FK overhead; document the choice in migration. |
| FOREIGN KEY | `cohort_id` → `cohorts(id)` ON DELETE RESTRICT |
| CHECK | `pg_column_size(metadata) < 8192` — 8 KB hard limit |
| CHECK | `pg_column_size(summary) < 1024` — 1 KB |
| CHECK | `team_id IS NOT NULL OR context = 'individual'` — team-context events must reference a team |
| CHECK | `(source_table IS NULL) = (source_id IS NULL)` |

## Indexes

| Index | Purpose |
|---|---|
| `(user_id, occurred_at DESC)` | user timeline — primary read |
| `(team_id, occurred_at DESC)` WHERE `team_id IS NOT NULL` | team timeline |
| `(cohort_id, occurred_at DESC)` | cohort-scoped admin reports / archival |
| `(user_id, category, occurred_at DESC)` | filter timeline by category |
| `(source_table, source_id)` | "what events did this entity produce?" |
| `(actor_user_id, occurred_at DESC)` WHERE `actor_user_id IS NOT NULL` | "what has this user done?" |
| `(type, occurred_at DESC)` | admin filtering by type |

## Rules

- **Append-only.** Never UPDATE or DELETE. If an event was incorrect, write a corrective event of a different type (e.g. `xp_adjustment`) — never edit the original.
- **Insert-only by SECURITY DEFINER functions.** Each domain operation that should appear on the timeline calls a helper that inserts the row.
- **One row per meaningful action.** A single domain action (e.g. team task approval) may insert multiple `activity_events` rows — one per affected user (each team member sees "Team task X approved" on their own timeline).
- **`transaction_id` is set only when the event also produced a reward.** Non-reward events (started a task, joined a team) leave it NULL.
- **Polymorphic source** is the deep-link target. Clicking the timeline entry navigates via `source_table` + `source_id`.
- **Fan-out for team events:** "team task approved" produces N rows — one per active team member at the time of approval.

## RLS

| Operation | Policy |
|---|---|
| SELECT | user reads their own; team members read each other's team-context events for the team they share; admins read all |
| INSERT | only via SECURITY DEFINER helpers — RLS denies direct inserts |
| UPDATE / DELETE | not exposed |

## Realtime broadcast — NO

`activity_events` is **NOT broadcast via Supabase Realtime** in V2. The activity feed updates on:
- App mount / page navigation
- Tab focus
- 30-second polling while the feed is visible
- Explicit user refresh

Why not Realtime: at 10k users with ~50k events/day = ~600/min sustained, broadcasting every event to every cohort subscriber would saturate Realtime well before that. The activity feed is a "near-real-time" surface, not "instant" — users won't notice 30s lag.

If real-time activity feed becomes a product requirement later (V2.1), the path is `pg_notify` → Supabase Edge Function fan-out per user, not direct Realtime broadcast. Don't change this without that infrastructure.

## What's intentionally NOT here

| Concern | Where it lives |
|---|---|
| XP / points changes themselves | `transactions` (linked via `transaction_id`) |
| Notifications (separate UX surface) | `notifications` |
| Row-level diffs / admin debug | `audit_log` |
| Authentication events (login, password reset) | Supabase auth tables — not surfaced here |
