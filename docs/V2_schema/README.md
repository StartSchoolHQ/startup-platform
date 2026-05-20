# V2 Schema

Working draft of the V2 database schema for the StartSchool platform. Each table is documented in its own file.

This is a clean redesign — not a patch on top of V1. Compared to current production:

- **Append-only ledger** for XP / points (no counter drift)
- **Templates split from per-user/per-team state** for stages, milestones, tasks
- **Polymorphic source linking** as a typed enum (`source_table` + `source_id`) for transactions, activity events, notifications, and task suggestions — never free text
- **First-class entities** for things V1 buries in jsonb (peer reviews → `team_task_reviews`)
- **No `journey_type` enum on shared tables** — individual and team domains are physically separate so they evolve independently
- **Phase tracking + cohort scoping** on `users.data` for proper program flow
- **XP/points cache split off identity** into `user_balances` so reward writes don't dirty the identity row
- **Monthly partitioning + retention** on the four high-volume append-only tables from day one
- **Defense in depth on writes**: RLS denies → SECURITY DEFINER RPC → `search_path` set → grant matrix enforced by CI gate → column-level protection triggers

---

## Tables

### Identity, ledger, and cross-cutting

| File | Purpose |
|---|---|
| [user.data.md](user.data.md) | Identity profile (mirrors `auth.users`), phase, cohort. **No XP/points cache here** — see `user_balances` |
| [user_balances.md](user_balances.md) | Cached XP/points per user, separate row from identity to isolate hot writes from hot reads |
| [cohorts.md](cohorts.md) | Student groups going through the program together |
| [transactions.md](transactions.md) | Append-only ledger of XP/points changes; partitioned monthly; typed polymorphic source |
| [activity_events.md](activity_events.md) | User-facing timeline of meaningful actions (separate from transactions and audit_log); partitioned monthly |
| [notifications.md](notifications.md) | In-app notifications with category, type, priority, polymorphic source; partitioned monthly; 90-day retention |
| [system_config.md](system_config.md) | Singleton key-value store for runtime config (penalties, defaults, thresholds) |

### Individual journey ("My Journey")

| File | Purpose |
|---|---|
| [individual_stages.md](individual_stages.md) | Stage templates (Mindset, Skills, Ideas, Network, Ready) |
| [individual_milestones.md](individual_milestones.md) | Bonus reward thresholds per stage |
| [individual_tasks.md](individual_tasks.md) | Task templates (auto-approve, no peer review) |
| [individual_task_progress.md](individual_task_progress.md) | Per-user task lifecycle (`in_progress` → `completed`) |
| [individual_journey.md](individual_journey.md) | Per-user stage progression + cached counts |
| [individual_milestone_unlocks.md](individual_milestone_unlocks.md) | Per-user milestone unlock events |

### Team journey

| File | Purpose |
|---|---|
| [teams.md](teams.md) | Team identity row (slug, founder, cohort, formation cost) |
| [team_members.md](team_members.md) | Junction table; one active team per user, with `left_reason` |
| [team_invitations.md](team_invitations.md) | Invitation lifecycle with auto-decline on accept |
| [team_stages.md](team_stages.md) | Team stage templates (independent from individual stages) |
| [team_milestones.md](team_milestones.md) | Team milestone templates (rewards per active member) |
| [team_tasks.md](team_tasks.md) | Team task templates (`standard` peer-reviewed / `confidential` admin-reviewed; recurring supported) |
| [team_task_progress.md](team_task_progress.md) | Per-team task attempts (with cooldown for recurring) |
| [team_journey.md](team_journey.md) | Per-team stage progression |
| [team_milestone_unlocks.md](team_milestone_unlocks.md) | Per-team milestone unlocks (fan-out to active members) |
| [team_task_reviews.md](team_task_reviews.md) | Reviews of team task submissions (peer or admin) |

### Reporting, attendance, support, accountability

| File | Purpose |
|---|---|
| [weekly_reports.md](weekly_reports.md) | Pre-created weekly check-in rows; submitted/missed/refunded |
| [absences.md](absences.md) | Session non-attendance (excused / unexcused), n8n-fed |
| [client_meetings.md](client_meetings.md) | Self-reported client meetings, admin-approved, rewarded |
| [revenue_streams.md](revenue_streams.md) | Self-reported revenue with proof, admin-approved, no XP — bragging rights |
| [team_strikes.md](team_strikes.md) | Team policy violations / warnings (events, not a counter) |
| [task_edit_suggestions.md](task_edit_suggestions.md) | User-submitted improvements to task templates (polymorphic) |
| [support_tickets.md](support_tickets.md) | User support requests, rate-limited |

### Scholarship agreements

Pre-cohort: students sign their scholarship contract via Dokobit eID
before they're rostered into a cohort. Not cohort-scoped (intentional
exception to rule 1).

| File | Purpose |
|---|---|
| [scholarship_agreements.md](scholarship_agreements.md) | Per-student scholarship contract row, draft → signed → archived |
| [scholarship_agreement_events.md](scholarship_agreement_events.md) | Append-only audit log for the agreement lifecycle |

### Operational specs (not tables, but mandatory)

| File | Purpose |
|---|---|
| [rpcs.md](rpcs.md) | Catalog of every `SECURITY DEFINER` function with grant matrix (`[client]`/`[internal]`/`[cron]`/`[admin]`), `search_path` requirements, and lock/isolation per RPC |
| [rls_policies.md](rls_policies.md) | Per-table RLS policies, helper predicates, `users_safe` and `user_balances_safe` views, column-level protection triggers, cache update bypass mechanism, CI gates |
| [invariants.md](invariants.md) | Data invariants V2 promises, how each is enforced, and audit queries that detect drift (cohort-scoped) |
| [partitioning.md](partitioning.md) | Monthly RANGE partitioning of high-volume append-only tables; maintenance cron with 3-week lead time; no default partition |
| [retention.md](retention.md) | Per-table retention policy + the cron jobs that drop old partitions |
| [archive_audit_log.md](archive_audit_log.md) | Cold-archive flow for `audit_log` partitions: queue table + Edge Function pg_dump → S3/Storage upload → DROP |

### Kept as-is (not redesigned)

| Table | Why |
|---|---|
| `audit_log` | Already does what we want — DB row diffs |
| `support_rate_limits` | Existing infra, used by `support_tickets` |

### Dropped from V1

| Table | Reason |
|---|---|
| `achievements`, `user_achievements`, `team_achievements` | Replaced by milestones |
| `leaderboard_snapshots`, `team_leaderboard_snapshots` | Computed live from cached XP columns |
| `tasks` (single shared table) | Split into `individual_tasks` and `team_tasks` |
| `task_progress` (single shared table) | Split into `individual_task_progress` and `team_task_progress` |
| `peer_reviews` history in jsonb | Promoted to first-class `team_task_reviews` |

---

## Best practices (the rules every spec follows)

These are not aspirational — they are the operating contract. Violating any of them in a new feature is a deploy blocker.

| # | Rule | Why |
|---|---|---|
| 1 | **Always cohort-scope.** Audit RPCs require `p_cohort_id`; admin queries default to a current-cohort context; all append-only inserts snapshot `cohort_id` at write time. Cross-cohort reads are explicit, not default. | Bounds query cost. Saves IO. Enables per-cohort archival without redesign. |
| 2 | **Never return more data than needed.** Reads route through views (`users_safe`, `user_balances_safe`) that whitelist columns; APIs select named columns, never `SELECT *`. | Defense in depth; less PII surface. |
| 3 | **All writes through `SECURITY DEFINER`.** App code never INSERTs / UPDATEs state-bearing tables directly. RLS denies; the RPC is the contract. | Single audit point per write path. |
| 4 | **Every DEFINER has `SET search_path = public, pg_catalog`** + explicit `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO <role>`. | Prevents schema-injection escalation; prevents accidental client exposure of internal helpers. |
| 5 | **RLS is `ENABLE` + `FORCE` on every public table.** Without `FORCE`, the table owner bypasses RLS — including service role doing things it shouldn't. | Last-mile defense. CI gate enforces. |
| 6 | **Generated columns over computed views** where the math is simple (e.g. `progress_percent`). | One-time write cost; zero read cost. |
| 7 | **Snapshot at completion.** Reward amounts, member counts, cohort_id at the time of an event are immutable on the resulting row. | History stays correct when admin tweaks templates. |
| 8 | **Append-only ledgers.** `transactions`, `activity_events`, `audit_log` never UPDATE/DELETE. Corrections are new rows of `type='reversal'`. | Reconciliation possible. Audit trail intact. |
| 9 | **Polymorphic source via typed enums** (`reward_source_table`, `entity_source_table`, `task_suggestion_source_table`) — never free text. Validation is `CASE source_table` dispatch, never `EXECUTE format`. | Prevents SQL identifier injection. |
| 10 | **No counter columns on parent tables.** `team_members` count, `team_strikes` count, etc. are computed live. | No drift. |
| 11 | **Soft delete via `status` / `cancelled_at`.** Never expose `DELETE` in RLS for audit-relevant tables. | History preservation. |
| 12 | **Idempotent fan-out.** Notifications and milestone unlocks dedupe via UNIQUE constraints + `(user_id, type, source_id)` lookups. | Cron retries are safe. |
| 13 | **Default 90-day window on user-history reads.** Partitioned tables benefit from partition pruning when the query has a date predicate. | Cuts cross-partition planning cost from 12 → 3-4 partitions. |
| 14 | **Sentry alert on every cron job failure.** Silent retention/audit failures are how invariants drift unnoticed. | Visibility. |

## Architectural patterns used consistently

| Pattern | Where |
|---|---|
| Append-only ledger | `transactions`, `activity_events`, `audit_log`, `team_task_reviews` |
| Templates vs state split | stages / milestones / tasks all have template + state tables |
| Polymorphic source (`source_table` + `source_id`) | `transactions`, `activity_events`, `notifications`, `task_edit_suggestions` |
| Snapshot at completion | task progress, milestone unlocks, transactions |
| No denormalized counters on parent tables | `users.data`, `teams` |
| Enum-driven types | every `status`, `type`, `category`, `priority` |
| SECURITY DEFINER for writes, RLS for reads | every write path — UI never writes directly |
| Soft delete via `status` / `cancelled_at` | not exposed `DELETE` in RLS |

---

## Shared enums (one definition, many users)

| Enum | Used by | Values |
|---|---|---|
| `journey_context` | `transactions`, `weekly_reports`, `activity_events` | `individual`, `team` |
| `journey_status` | `individual_journey`, `team_journey` | `locked`, `current`, `completed` |
| `team_role` | `team_members`, `team_invitations` | `founder`, `member` |
| `task_difficulty` | `individual_tasks`, `team_tasks` | `easy`, `medium`, `hard` |

---

## Phase flow

```
SIGNUP
  ↓ users.data.phase = 'individual'
  ↓ individual_journey rows created (first stage = current, rest = locked)
INDIVIDUAL JOURNEY
  ↓ user completes individual stages → tasks → milestones
  ↓ last individual stage completed
  ↓ phase = 'awaiting_team'
INVITATION OR TEAM CREATION
  ↓ user joins a team → team_members row
  ↓ phase = 'team'
  ↓ team_journey rows created for the team's first stage
TEAM JOURNEY
  ↓ team completes stages → tasks (peer-reviewed) → milestones
  ↓ last team stage completed
  ↓ phase = 'graduated'
```

---

## Conventions

- Every table has `created_at` and (where state is mutable) `updated_at` maintained by trigger.
- Every FK to `users.data(id)` uses `ON DELETE CASCADE` for owned data, `SET NULL` for references-with-history.
- Every FK to `teams(id)` uses `ON DELETE CASCADE` for team-owned data, `SET NULL` for references-with-history.
- Every FK to a template table (stages, milestones, tasks) uses `ON DELETE RESTRICT` — admins must deactivate (`is_active = false`) instead of deleting.
- All counters and totals on `users.data` are CACHES rebuilt from `transactions` by trigger. App code never writes them directly.
- `slug` columns are auto-generated from `name`, lowercase alphanumerics + hyphens, with `-2` / `-3` collision suffix.
- All status / type / category / priority columns are PostgreSQL enums, never free text.

---

## Tech stack context

| Concern | Tool |
|---|---|
| Database / Auth / Storage / Realtime | Supabase Pro (manual backups + PITR + read replicas available) |
| Hosting | Vercel Pro |
| Product analytics + feature flags | PostHog |
| Error tracking | Sentry |
| Workflow automation | n8n (drives `record_unexcused_absence` from Google Calendar) |
| Future chatbot | Reads from Notion (knowledge base). **Not** stored in this DB. Keeps the schema lean. |

## Open questions / known tradeoffs

| Item | Status |
|---|---|
| Polymorphic source FK enforcement | Postgres can't FK-enforce polymorphic targets. Mitigated by typed enum + `CASE` dispatch in `award_transaction` + `audit_orphan_polymorphic_sources` cron. |
| Trigger chain depth on team task approval (~6 levels, linear in N members) | Acceptable at small team sizes. SERIALIZABLE on the milestone-unlock RPCs. |
| Admins not in any cohort | Intentional — admins oversee all cohorts. |
| Per-cohort stage / milestone overrides | Not in V2. Add `cohort_stage_overrides` table later if needed. |
| In-app support thread (back-and-forth messaging) | Not in V2. Email / DM for now. |
| File attachments registry table | Not in V2. URLs in jsonb fields only, with size limits. |
| Multi-tenancy | **Out of scope.** Cohorts cover the multi-batch use case for a single accelerator. Tenant model (separate organizations licensing the platform) is not on the roadmap; if it becomes one, expect a per-table migration. Single accelerator + multiple cohorts = no `tenant_id` columns. |
| Realtime broadcast | **Two channels only**: `notifications` (per-user filter) for bell badge / toast; `user_balances` (per-cohort filter) for live leaderboard. `activity_events` is **not** broadcast — feed updates on poll / focus. See per-table specs for subscription patterns. |
| Chatbot data | Lives in Notion (read-only via API), not the DB. Keeps `users.data` and journey tables uncluttered. |
| `auth.users.last_sign_in_at` reliability | Supabase only updates on actual sign-in (not session refresh). V2 adds `users.data.last_active_at` + `record_user_active` debounced RPC for an honest engagement signal. |

---

## Status

Schema design + operational specs are complete. **Greenfield deployment** — V1 will be archived; V2 launches with the next cohort. No data migration is planned.

### Next concrete steps

1. Provision a fresh Supabase project for V2 (V1 stays archived).
2. Write SQL migrations from these specs in this order:
   - Enums (`journey_context`, `transaction_source_table`, `transaction_type`, `task_difficulty`, etc.)
   - Tables — partitioned tables (`transactions`, `activity_events`, `notifications`, `audit_log`) declared `PARTITION BY RANGE (created_at)` per [partitioning.md](partitioning.md)
   - Default + launch-month partitions
   - All indexes (declared on parent for partitioned tables)
   - Helper predicates (`is_admin`, `is_active_team_member`, `current_user_cohort_id`) — each with `SET search_path`
   - `users_safe` and `user_balances_safe` views
   - Column-protection triggers (`tr_protect_users_data_columns`, `tr_protect_notifications_columns`, `tr_protect_user_balances`)
   - Cache-update trigger (`tr_apply_transaction_to_balance`)
   - RLS policies per table per [rls_policies.md](rls_policies.md)
   - SECURITY DEFINER RPCs from [rpcs.md](rpcs.md), each with `SET search_path` and the documented REVOKE/GRANT pattern
   - Cron schedules: `maintain_partitions`, `drop_old_partitions`, `expire_notifications`, `mark_weekly_reports_missed`, `precreate_weekly_reports`, `send_weekly_report_reminders`, `expire_pending_invitations`, `audit_user_xp_drift`, `audit_orphan_polymorphic_sources`
3. **CI gates** (block deploy if any fail):
   - Every public table has `relrowsecurity = true AND relforcerowsecurity = true`
   - Every SECURITY DEFINER function has `search_path` set
   - No `[internal]` or `[cron]` function has EXECUTE granted to `authenticated` / `anon` / `PUBLIC`
   - No INSERT policy granting `authenticated` on append-only ledger tables
4. Seed initial rows:
   - First `cohorts` row
   - `system_config` defaults (penalty values, formation cost, etc.)
   - `individual_stages` + `individual_milestones`
   - `team_stages` + `team_milestones`
5. Rewrite app data layer (`src/lib/data/`) and API routes against V2 — every write goes through an RPC from [rpcs.md](rpcs.md), no exceptions.
6. Wire Sentry alerts on each cron job failure — silent retention/audit failures are how invariants drift unnoticed.
