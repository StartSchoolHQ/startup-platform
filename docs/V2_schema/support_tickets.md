# `support_tickets`

User-submitted support requests — bug reports, account issues, feature requests, general questions. One row per ticket. Admins triage, respond, and close. Submission is rate-limited via the existing `support_rate_limits` table (15-minute cooldown per user).

In-app responses are out of scope for V2 (admins reply via email or DM); this table is for **tracking + searchability** of what's been submitted, by whom, and where it stands.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE SET NULL — submitter |
| `category` | enum `support_category` | NO | — | `bug`, `account`, `feature_request`, `task_issue`, `peer_review_issue`, `other` |
| `priority` | enum `support_priority` | NO | `'normal'` | `low`, `normal`, `high`, `critical` (admin-set; users default to normal) |
| `status` | enum `support_status` | NO | `'open'` | `open`, `in_progress`, `waiting_on_user`, `resolved`, `closed` |
| `subject` | text | NO | — | one-line summary |
| `message` | text | NO | — | full body |
| `attachments` | jsonb | YES | — | optional Supabase Storage URLs (e.g. screenshots) |
| `source_table` | enum `transaction_source_table` | YES | — | optional polymorphic deep-link to a related entity. Reuses `transaction_source_table` enum so support tickets can deep-link to any of the same entities. |
| `source_id` | uuid | YES | — | the related row |
| `assigned_to_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL — admin handling it |
| `resolution_note` | text | YES | — | admin's closing summary |
| `resolved_at` | timestamptz | YES | — | |
| `closed_at` | timestamptz | YES | — | terminal state |
| `metadata` | jsonb | YES | — | overflow (browser, app version, etc.) |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `support_category` | `bug`, `account`, `feature_request`, `task_issue`, `peer_review_issue`, `other` |
| `support_priority` | `low`, `normal`, `high`, `critical` |
| `support_status` | `open`, `in_progress`, `waiting_on_user`, `resolved`, `closed` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `user_id` → `users.data(id)` ON DELETE SET NULL |
| FOREIGN KEY | `assigned_to_user_id` → `users.data(id)` ON DELETE SET NULL |
| CHECK | `(source_table IS NULL) = (source_id IS NULL)` |
| CHECK | `(status = 'resolved') = (resolved_at IS NOT NULL)` |
| CHECK | `(status = 'closed') = (closed_at IS NOT NULL)` |
| CHECK | `length(subject) BETWEEN 3 AND 200` |
| CHECK | `length(message) >= 10` |

## Indexes

| Index | Purpose |
|---|---|
| `(status, priority DESC, created_at DESC)` WHERE `status IN ('open','in_progress','waiting_on_user')` | admin queue — primary read |
| `(user_id, created_at DESC)` | user's own tickets |
| `(assigned_to_user_id, status)` WHERE `assigned_to_user_id IS NOT NULL` | "tickets assigned to me" |
| `(category, created_at DESC)` | category-based reporting |
| `(source_table, source_id)` | "tickets related to this entity" |

## Rules

- **Rate limited at submission** by `support_rate_limits` (existing table, 15-minute cooldown). The submission RPC checks this before insert.
- **No XP / points reward** for submitting tickets.
- **Only the submitter and admins read a ticket.** Other users do not see it.
- **Admin response flow** is out-of-band (email / DM) for V2. The `resolution_note` documents what was done; the actual conversation lives in email. Future V2.1 could add an in-app `support_messages` thread table.
- **Status transitions** are admin-driven via SECURITY DEFINER RPCs. The user can only ADD context (a follow-up message via metadata) when status is `waiting_on_user`; full conversation thread is post-V2 scope.
- **Polymorphic source** lets a user open a ticket from a specific peer review or task page, pre-filling `source_table` / `source_id` so admins land on the right entity.
- **Soft-archive** by setting `status = 'closed'` and `closed_at` — never delete tickets.

## RLS

| Operation | Policy |
|---|---|
| SELECT | submitter reads their own; admins read all |
| INSERT | only via SECURITY DEFINER `submit_ticket` RPC (which checks rate limit) |
| UPDATE | only via SECURITY DEFINER admin RPCs (`assign_ticket`, `update_ticket_status`, `resolve_ticket`) |
| DELETE | not exposed |

## What's intentionally NOT here

| Concern | Why |
|---|---|
| Conversation thread (back-and-forth messages) | Out of scope for V2 — handled via email. Future `support_messages` table if needed. |
| SLA / response-time tracking | Out of scope. Use `created_at` vs `resolved_at` for ad-hoc analysis. |
| Auto-categorization / NLP | Out of scope. |
| Public knowledge base / FAQs | Separate concern, not modeled. |
