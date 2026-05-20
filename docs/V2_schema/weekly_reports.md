# `weekly_reports`

Weekly check-in form. One row per `(user, context, week)`. Pre-created as `pending` by a weekly cron, then flipped to `submitted` when the user fills it, or to `missed` if the deadline passes.

Currently used for the **team journey** (when a user is in an active team). Individual-journey reports are not in scope yet, but the schema is already shaped to support them via the `context` enum — flip the cron to also pre-create `individual` rows when that feature lands.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE CASCADE — who the report belongs to |
| `team_id` | uuid | YES | — | FK → `teams(id)` ON DELETE SET NULL — only set when `context = 'team'` |
| `context` | enum `journey_context` | NO | — | `individual` / `team` (shared enum with `transactions`) |
| `week_start_date` | date | NO | — | inclusive |
| `week_end_date` | date | NO | — | inclusive |
| `week_number` | int | NO | — | per-team week (matches `teams.current_week` at creation) for team reports; ISO week for individual |
| `week_year` | int | NO | — | |
| `due_at` | timestamptz | NO | — | submission deadline |
| `status` | enum `weekly_report_status` | NO | `'pending'` | `pending`, `submitted`, `missed`, `refunded` |
| `submission_data` | jsonb | YES | — | structured form fields |
| `submitted_at` | timestamptz | YES | — | |
| `missed_at` | timestamptz | YES | — | when cron flipped it to `missed` |
| `refunded_at` | timestamptz | YES | — | when admin refunded |
| `penalty_transaction_id` | uuid | YES | — | FK → `transactions(id)` — set if `status = 'missed'` |
| `refund_transaction_id` | uuid | YES | — | FK → `transactions(id)` — set if `status = 'refunded'` |
| `metadata` | jsonb | YES | — | overflow |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `weekly_report_status` | `pending`, `submitted`, `missed`, `refunded` |
| `journey_context` | shared with `transactions`: `individual`, `team` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `user_id` → `users.data(id)` ON DELETE CASCADE |
| FOREIGN KEY | `team_id` → `teams(id)` ON DELETE SET NULL |
| FOREIGN KEY | `penalty_transaction_id` → `transactions(id)` ON DELETE SET NULL |
| FOREIGN KEY | `refund_transaction_id` → `transactions(id)` ON DELETE SET NULL |
| UNIQUE | `(user_id, context, week_start_date)` — one report per user per context per week |
| CHECK | `team_id IS NOT NULL` when `context = 'team'` |
| CHECK | `team_id IS NULL` when `context = 'individual'` |
| CHECK | `week_end_date >= week_start_date` |
| CHECK | `due_at >= week_start_date` |
| CHECK | `(status = 'submitted') = (submitted_at IS NOT NULL AND submission_data IS NOT NULL)` |
| CHECK | `(status = 'missed') = (missed_at IS NOT NULL AND penalty_transaction_id IS NOT NULL)` |
| CHECK | `(status = 'refunded') = (refunded_at IS NOT NULL AND refund_transaction_id IS NOT NULL)` |
| CHECK | `pg_column_size(submission_data) < 32768` — 32 KB hard limit |

## Indexes

| Index | Purpose |
|---|---|
| `(user_id, week_start_date DESC)` | user report history |
| `(team_id, week_start_date DESC)` WHERE `team_id IS NOT NULL` | team report history |
| `(status, due_at)` WHERE `status = 'pending'` | reminder + miss-detect cron |
| `(week_start_date DESC, status)` | admin cross-cohort week browser |
| `(context, week_start_date DESC)` | admin filtering by phase |

## Lifecycle

| Stage | Trigger | What happens |
|---|---|---|
| **Pre-create** | weekly cron at start of week | INSERT a `pending` row for every active team-phase user (and individual-phase users if/when that's enabled). `due_at` = end of week. |
| **Remind** | daily cron during the week | If `status = 'pending'`, fire `weekly_report_reminder_2day` / `_1day` / `_due_today` notifications based on `due_at - now()`. |
| **Submit** | user fills form → SECURITY DEFINER `submit_weekly_report` | Set `status = 'submitted'`, `submitted_at`, `submission_data`. No transaction (submission isn't directly rewarded; the absence of submission is what's penalized). |
| **Miss** | cron at `due_at` | Process in chunks of 500 rows. `SELECT id FROM weekly_reports WHERE status='pending' AND submitted_at IS NULL AND due_at <= now() FOR UPDATE SKIP LOCKED LIMIT 500`. **The `submitted_at IS NULL` predicate is mandatory** — without it, a race with `submit_weekly_report` would produce a row where `status='missed' AND submitted_at IS NOT NULL`, violating the `(status='submitted') = (submitted_at IS NOT NULL …)` CHECK. For each: flip `status = 'missed'`, set `missed_at`, INSERT `transactions` row (`type = 'weekly_report_missed'`, negative `xp_change` / `points_change` per system config, `context` matches the row's `context`, `team_id` set if team), set `penalty_transaction_id`. Send `weekly_report_missed` notification. COMMIT after each chunk. |
| **Refund** | admin RPC `refund_weekly_report` | Set `status = 'refunded'`, `refunded_at`. INSERT `transactions` row of `type = 'reversal'` referencing the penalty (`metadata.reverses_transaction_id = penalty_transaction_id`). Set `refund_transaction_id`. Send `weekly_report_refunded` notification. |

## Penalty config

The penalty amount (XP and points deducted on miss) is **system-level config**, not stored on this table. Source of truth is a small `system_config` table (or constant) that the cron reads at miss time. Each `transactions` row already snapshots the deducted amounts, so changing the config later doesn't retroactively alter past penalties.

| Config key | Notes |
|---|---|
| `weekly_report_penalty_xp` | int, e.g. `-50` |
| `weekly_report_penalty_points` | int, e.g. `-100` |

(Defining the `system_config` table is out of scope for this file — design separately when needed.)

## RLS

| Operation | Policy |
|---|---|
| SELECT | user can read their own; team members can read each other's team-context reports; admins read all |
| INSERT | only via SECURITY DEFINER `precreate_weekly_reports` cron RPC |
| UPDATE | only via SECURITY DEFINER RPCs (`submit_weekly_report`, `mark_weekly_reports_missed`, `refund_weekly_report`) |
| Trigger | `tr_protect_weekly_reports_columns` BEFORE UPDATE — non-admin/non-service callers may not change `status`, `submission_data`, `due_at`, `penalty_transaction_id`, `refund_transaction_id`, or any cohort-scoping field. Only DEFINER RPCs may. |
| DELETE | not exposed — full history preserved |

## What's intentionally NOT here

| Concern | Lives in |
|---|---|
| Penalty amount per row | `transactions.xp_change` / `points_change` (source of truth, immutable snapshot) |
| Reminder send history | `notifications` rows with `source_table = 'weekly_reports'`, `source_id = <this row's id>` |
| Per-week submission rate stats | derive via `COUNT(*) GROUP BY status, week_start_date` |
| Grading / quality of submission | not modeled — submission either exists or it doesn't |

## Forward-compatibility note for individual reports

When/if individual weekly reports go live:
- Cron also pre-creates `pending` rows with `context = 'individual'` and `team_id = NULL` for users in the individual phase.
- Same `submission_data` jsonb (shape can differ via `metadata.template_version`).
- Same penalty/refund flow, with `context = 'individual'` on the resulting `transactions` rows.
- No schema migration needed.
