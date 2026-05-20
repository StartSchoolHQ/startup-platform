# `transactions`

Append-only ledger for all XP and points changes. The single source of truth for the cached totals on [user_balances](user_balances.md). Polymorphic `source_*` design (typed enum, not free text) — new reward sources never require a schema change.

**Partitioned by month on `created_at`** — see [partitioning.md](partitioning.md). At V2 launch, the parent table is partitioned but only the current month exists; new monthly partitions are created by a cron job.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE CASCADE — who earned/lost |
| `team_id` | uuid | YES | — | FK → `teams(id)` ON DELETE SET NULL — only when `context='team'` |
| `cohort_id` | uuid | YES | — | FK → `cohorts(id)` ON DELETE RESTRICT — denormalized snapshot of `users.data.cohort_id` at insert time. Lets cohort archival / per-cohort reports avoid joining `users.data`. NULL only for admin-grant transactions to admin users. |
| `type` | enum `transaction_type` | NO | — | see enum |
| `context` | enum `journey_context` | NO | — | drives which cache column updates on `user_balances` |
| `xp_change` | int | NO | — | signed (negative = penalty / reversal) |
| `points_change` | int | NO | — | signed |
| `source_table` | enum `reward_source_table` | YES | — | typed polymorphic source for reward-producing entities. Distinct enum from the broader `entity_source_table` used by `notifications` / `activity_events` / `support_tickets` — adding a non-reward entity (e.g. a chatbot interaction) doesn't pollute the reward dispatch in `award_transaction`. |
| `source_id` | uuid | YES | — | row that caused the transaction |
| `stage_id` | uuid | YES | — | FK → `individual_stages(id)` or `team_stages(id)` (resolved by `context`) — snapshot of the stage this reward is associated with. Lets per-stage XP rollups skip the polymorphic join. NULL for transactions not tied to a stage (admin grants, weekly reports — though weekly reports could populate it). |
| `description` | text | YES | — | human-readable, for UI history |
| `metadata` | jsonb | YES | — | overflow (`granted_by_user_id`, `reverses_transaction_id`, multipliers, week markers, …). Size-bounded. |
| `created_at` | timestamptz | NO | `now()` | partition key |

## Enums

| Enum | Values |
|---|---|
| `journey_context` | `individual`, `team` |
| `transaction_type` | `task_completed`, `peer_review_completed`, `weekly_report_submitted`, `weekly_report_missed`, `meeting_attended`, `milestone_unlocked`, `admin_adjustment`, `reversal` |
| `reward_source_table` | `individual_task_progress`, `team_task_progress`, `team_task_reviews`, `weekly_reports`, `client_meetings`, `individual_milestone_unlocks`, `team_milestone_unlocks` |

The `reward_source_table` enum is **transactions-only**. A separate `entity_source_table` enum (used by `activity_events`, `notifications`, `support_tickets`) covers the broader set of entities that can be deep-linked or referenced but don't produce rewards. `task_edit_suggestions` keeps its own narrow `task_suggestion_source_table`. Three enums by responsibility, no cross-coupling — a non-reward addition doesn't pollute `award_transaction`'s `CASE` dispatch.

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `(id, created_at)` — composite required by partitioning |
| FOREIGN KEY | `user_id` → `users.data(id)` ON DELETE CASCADE |
| FOREIGN KEY | `team_id` → `teams(id)` ON DELETE SET NULL |
| FOREIGN KEY | `cohort_id` → `cohorts(id)` ON DELETE RESTRICT |
| CHECK | `(type = 'admin_adjustment') OR cohort_id IS NOT NULL` — every non-grant transaction has a cohort; only admin grants to admin recipients may have NULL |
| CHECK | `team_id IS NOT NULL` when `context = 'team'` |
| CHECK | `team_id IS NULL` when `context = 'individual'` |
| CHECK | NOT (`xp_change = 0 AND points_change = 0`) — no zero-impact rows |
| CHECK | `(source_table IS NULL) = (source_id IS NULL)` — both or neither |
| CHECK | `pg_column_size(metadata) < 16384` — 16 KB hard limit, prevents jsonb DoS |
| CHECK | `pg_column_size(description) < 2048` — 2 KB |
| RLS | INSERT/UPDATE only via SECURITY DEFINER award functions — append-only ledger |
| RLS | SELECT — users read their own, team members read their team's, admins read all |

## Indexes

| Index | Purpose |
|---|---|
| `(user_id, created_at DESC)` | user transaction history — primary read |
| `(team_id, created_at DESC)` WHERE `team_id IS NOT NULL` | team history |
| `(cohort_id, created_at DESC)` | cohort-scoped admin reports |
| `(source_table, source_id)` | "what rewards did record X produce?" |
| `(user_id, stage_id, context) WHERE stage_id IS NOT NULL` | per-stage XP rollup on dashboard |
| `(type, created_at DESC)` | admin filtering by action type |
| `(user_id, type, created_at DESC) WHERE type = 'peer_review_completed'` | "my peer-review earnings" history |
| Expression index on `(metadata->>'reverses_transaction_id')` WHERE `metadata ? 'reverses_transaction_id'` | refund lookups (cheaper than full GIN at low cardinality) |

## Rules

| Rule | |
|---|---|
| Append-only | Never UPDATE or DELETE. Corrections via `type = 'reversal'` referencing `metadata.reverses_transaction_id` |
| Single source of truth for XP/points | [user_balances](user_balances.md) cached columns are rebuilt from this table by AFTER INSERT trigger. Trigger sets `SET LOCAL app.cache_update_in_progress = 'on'` so the column-protection trigger on `user_balances` permits the write. |
| One row per reward event | XP and points always co-issued in the same row |
| Polymorphic source | New reward source = new `transaction_type` enum value + new `transaction_source_table` enum value + new dispatch arm in `award_transaction`'s `CASE`. Three deliberate edits, no schema migration of existing rows. |
| Admin grants | Use `type = 'admin_adjustment'`, put admin id in `metadata.granted_by_user_id`. `source_table` and `source_id` are NULL. |
| Cohort denorm | `cohort_id` is set by `award_transaction` from `users.data.cohort_id` at insert time. Never updated thereafter — historical cohort membership is an immutable property of the transaction. NULL is permitted only for `admin_adjustment` granted to admin recipients (admins have no cohort). |
| Stage denorm | `stage_id` is set by `award_transaction` when the reward is stage-tied (task completion, milestone unlock); NULL otherwise. |
| Soft-FK lifetime safety | Tables that reference `transactions.id` (e.g. `team_task_reviews.transaction_id`, `weekly_reports.penalty_transaction_id` / `refund_transaction_id`, `activity_events.transaction_id`) use a UUID-only soft FK because partitioned-table FKs require composite `(id, created_at)`. **`transactions` is never partition-dropped** (lifetime retention by policy — see [retention.md](retention.md)) so back-references can never be orphaned. The audit query `audit_orphan_polymorphic_sources` covers the forward direction (transactions referencing source rows) — the reverse direction is safe by design, not by check. |

## Reward mapping (full source table)

| Action | type | context | team_id | cohort_id | source_table | stage_id |
|---|---|---|---|---|---|---|
| Individual task approved | `task_completed` | `individual` | NULL | user's cohort | `individual_task_progress` | task's stage |
| Team task approved (per member fan-out) | `task_completed` | `team` | set | team's cohort | `team_task_progress` | task's stage |
| Peer review completed (reviewer reward) | `peer_review_completed` | `team` | reviewer's *current* team if any | reviewer's cohort | `team_task_reviews` | NULL |
| Weekly report submitted (individual) | `weekly_report_submitted` | `individual` | NULL | user's cohort | `weekly_reports` | NULL |
| Weekly report submitted (team) | `weekly_report_submitted` | `team` | user's team | user's cohort | `weekly_reports` | NULL |
| Weekly report missed (individual) | `weekly_report_missed` | `individual` | NULL | user's cohort | `weekly_reports` | NULL |
| Weekly report missed (team) | `weekly_report_missed` | `team` | user's team | user's cohort | `weekly_reports` | NULL |
| Individual milestone unlocked | `milestone_unlocked` | `individual` | NULL | user's cohort | `individual_milestone_unlocks` | milestone's stage |
| Team milestone unlocked (per member fan-out) | `milestone_unlocked` | `team` | set | team's cohort | `team_milestone_unlocks` | milestone's stage |
| Client meeting approved (per member fan-out) | `meeting_attended` | `team` | set | team's cohort | `client_meetings` | NULL |
| Admin grant / penalty | `admin_adjustment` | either | optional | user's cohort (or NULL for admin user) | NULL | NULL |
| Reversal | `reversal` | matches reversed | matches reversed | matches reversed | matches reversed | matches reversed |

## What's intentionally NOT in this table

| Concern | Lives in |
|---|---|
| Cache totals (per user, per context) | [user_balances](user_balances.md) |
| Peer review state (assignment, decision, feedback) | `team_task_reviews` |
| Validator identity (reviewer / admin) | Source row (e.g. `team_task_reviews.reviewer_user_id`); admin actions in `metadata.granted_by_user_id` |
| User actions without rewards (started task, viewed page) | `activity_events` |
| Notifications | `notifications` |
| DB row diffs | `audit_log` |
