# `notifications`

Per-user in-app notifications. One row per delivered notification. Polymorphic via `source_table` (typed enum) + `source_id` for deep-linking. Type and category are enums to prevent free-text drift.

**Partitioned by month on `created_at`** — see [partitioning.md](partitioning.md). Aggressive 90-day retention (see [retention.md](retention.md)) — notifications are ephemeral, the ledger is the audit trail.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | recipient. FK → `users.data(id)` ON DELETE CASCADE |
| `actor_user_id` | uuid | YES | — | who triggered it (e.g., the teammate who assigned a task). FK → `users.data(id)` ON DELETE SET NULL |
| `category` | enum `notification_category` | NO | — | high-level group used for UI filtering |
| `type` | enum `notification_type` | NO | — | specific event |
| `priority` | enum `notification_priority` | NO | `'normal'` | `low` / `normal` / `high` / `critical` |
| `title` | text | NO | — | UI title |
| `message` | text | YES | — | longer body |
| `cohort_id` | uuid | YES | — | FK → `cohorts(id)` ON DELETE RESTRICT — denormalized snapshot for cohort archival. NULL only for admin-targeted notifications. |
| `source_table` | enum `entity_source_table` | YES | — | typed polymorphic deep-link target. Shared enum with `activity_events`, `support_tickets`, `team_strikes` — broader than the reward-only `reward_source_table` used by `transactions`. |
| `source_id` | uuid | YES | — | row that triggered the notification |
| `action_url` | text | YES | — | where clicking sends the user (in-app path) |
| `metadata` | jsonb | YES | — | overflow (week markers, xp_amount, etc.) |
| `read_at` | timestamptz | YES | — | when user read or dismissed |
| `expires_at` | timestamptz | YES | — | auto-hide / cleanup after this |
| `created_at` | timestamptz | NO | `now()` | |

## Enums

| Enum | Values |
|---|---|
| `notification_category` | `peer_review`, `task`, `journey`, `weekly_report`, `invitation`, `team`, `system` |
| `notification_priority` | `low`, `normal`, `high`, `critical` |
| `notification_type` | see mapping below |

### `notification_type` ↔ `notification_category`

| Category | Types | Typical recipient |
|---|---|---|
| `peer_review` | `peer_review_assigned`, `peer_review_expired` | reviewer |
| `task` | `task_assigned`, `team_task_approved`, `team_task_rejected`, `confidential_task_submitted` | assignee / team members / admins |
| `journey` | `stage_unlocked`, `stage_completed`, `milestone_unlocked` | user (or each team member for team journey) |
| `weekly_report` | `weekly_report_reminder_2day`, `weekly_report_reminder_1day`, `weekly_report_due_today`, `weekly_report_missed`, `weekly_report_refunded` | user |
| `invitation` | `invitation_received`, `invitation_accepted`, `invitation_declined`, `invitation_expired` | inviter or invitee |
| `team` | `team_member_joined`, `team_member_left`, `team_role_changed` | team members |
| `system` | `xp_adjustment`, `account_status_change`, `announcement` | user |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `user_id` → `users.data(id)` ON DELETE CASCADE |
| FOREIGN KEY | `actor_user_id` → `users.data(id)` ON DELETE SET NULL |
| FOREIGN KEY | `cohort_id` → `cohorts(id)` ON DELETE RESTRICT |
| CHECK | `(source_table IS NULL) = (source_id IS NULL)` — both or neither |
| CHECK | `expires_at IS NULL OR expires_at > created_at` |
| CHECK | `pg_column_size(metadata) < 4096` — 4 KB hard limit |
| CHECK | `length(title) BETWEEN 1 AND 200` |
| CHECK | `message IS NULL OR length(message) <= 1000` |
| CHECK | `action_url IS NULL OR length(action_url) <= 500` |
| Trigger | `tr_protect_notifications_columns` BEFORE UPDATE: for non-admin callers, only `read_at` may differ from OLD. Any other column delta raises. |

## Indexes

| Index | Purpose |
|---|---|
| `(user_id, created_at DESC) WHERE read_at IS NULL` | unread feed / bell badge — **partial index, stays microscopic** |
| `(user_id, created_at DESC)` | full notification feed |
| `(user_id, category, created_at DESC)` | UI filtering by category |
| `(cohort_id, created_at DESC)` | cohort-scoped admin reports |
| `(expires_at)` WHERE `expires_at IS NOT NULL` | cleanup background job |
| `(source_table, source_id)` | "what notifications does this entity have?" |
| `(user_id, type, source_id) WHERE source_id IS NOT NULL` | idempotency dedupe — DEFINER helpers check existence before INSERT |

## Rules

- **Insert-only by SECURITY DEFINER functions.** App code never writes directly. Each domain operation (peer review assignment, task approval, milestone unlock, etc.) calls a notification helper that inserts the row.
- **Read state:** `read_at` covers both "read" and "dismissed". A null = unread. Setting it to `now()` marks it read. No separate dismiss flag.
- **Polymorphic source:** `source_table` + `source_id` deep-links to the entity. Adding a new notification source (e.g., a future `coaching_sessions` table) requires no schema change — just a new `notification_type` enum value.
- **Action URL:** stored at insert time (not derived). Lets the same notification type point to different routes if business rules evolve, without rewriting client code.
- **Priority drives UI affordances:** `critical` may show as a banner, `high` as a toast, `normal` as a list item, `low` collapsed under "see more".
- **Expiry:** time-sensitive notifications (e.g. `weekly_report_due_today`) set `expires_at`. A nightly job soft-deletes expired notifications. Persistent notifications (achievements, milestones) leave `expires_at` NULL.
- **Fan-out for team events:** team-wide events (e.g. `team_task_approved`) result in N notification rows — one per active team member at the time of the event.
- **Idempotency:** the helper functions use `(user_id, type, source_id)` to prevent duplicate notifications for the same event (e.g. running a reminder cron twice).

## RLS

| Operation | Policy |
|---|---|
| SELECT | user can read their own; admins can read all |
| INSERT | only via SECURITY DEFINER notification helpers — RLS denies direct inserts |
| UPDATE | user can mark their own as read (`read_at`); admins can update any |
| DELETE | user cannot delete (audit trail); admins can delete; cleanup job uses service role |

## Realtime broadcast

`notifications` is **broadcast via Supabase Realtime** — this is one of two tables in V2 with live subscriptions (the other is `user_balances` for live leaderboard). Activity feed and other tables are NOT broadcast.

| Subscription pattern | Use case |
|---|---|
| `notifications:user_id=eq.<auth.uid()>` | Bell badge, toast popup. Per-user filter is mandatory — never subscribe table-wide. |

The per-user filter keeps fan-out small even at 10k users. Server publishes one row change; Supabase Realtime delivers only to subscribers whose filter matches. At 10k users with ~30k notifications/day, sustained load ≈ 0.3 broadcasts/sec; peaks during cohort task-approval bursts are ~10/sec. Well within Pro tier headroom.

App side: subscribe on app mount; resubscribe on auth state change; tear down on logout. Use the official `@supabase/supabase-js` realtime channel API.

## What's intentionally NOT here

| Concern | Reason |
|---|---|
| Email / push delivery state | Out of scope for V2. Future: separate `notification_deliveries` table tracking per-channel state, keyed by `notification_id`. |
| Grouping / threading | A "5 invitations to teams" rollup is a UI-side aggregation, not a schema concern. |
| `dismissed_at` separate from `read_at` | Combined into `read_at`. UX doesn't differentiate. |
| `team_id` column | Team-scoped events fan out to per-member notifications; team_id (when relevant) lives in `metadata`. |
| Scheduled notifications (send at future time) | Out of scope. Reminders are inserted at the moment they're due by a cron job. |
