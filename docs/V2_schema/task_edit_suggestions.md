# `task_edit_suggestions`

User-submitted suggestions to improve task templates — typo fixes, clearer instructions, broken resource links, etc. Single table covering both `individual_tasks` and `team_tasks` via polymorphic `source_table` + `source_id`. Admin reviews and applies or rejects.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `source_table` | enum `task_suggestion_source_table` | NO | — | `'individual_tasks'` or `'team_tasks'` — separate enum from `transaction_source_table` since the value space differs |
| `source_id` | uuid | NO | — | the task uuid being suggested for edit |
| `suggested_by_user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE CASCADE — who submitted |
| `suggestion_type` | enum `task_edit_suggestion_type` | NO | — | `typo`, `clarity`, `broken_resource`, `factual_error`, `other` |
| `current_text` | text | YES | — | snapshot of the field as it was (for reference) |
| `proposed_text` | text | YES | — | the suggested replacement |
| `target_field` | text | YES | — | which field the suggestion targets (e.g. `instructions`, `description`, `title`) |
| `notes` | text | YES | — | freeform context from the suggester |
| `status` | enum `task_edit_suggestion_status` | NO | `'pending'` | `pending`, `accepted`, `rejected`, `superseded` |
| `reviewed_by_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL — admin who reviewed |
| `review_feedback` | text | YES | — | admin's reason on accept/reject |
| `reviewed_at` | timestamptz | YES | — | |
| `metadata` | jsonb | YES | — | overflow |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `task_edit_suggestion_type` | `typo`, `clarity`, `broken_resource`, `factual_error`, `other` |
| `task_edit_suggestion_status` | `pending`, `accepted`, `rejected`, `superseded` |
| `task_suggestion_source_table` | `individual_tasks`, `team_tasks` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `suggested_by_user_id` → `users.data(id)` ON DELETE CASCADE |
| FOREIGN KEY | `reviewed_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| CHECK | `(status IN ('accepted','rejected')) = (reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL)` |
| CHECK | `length(notes) <= 2000` |
| CHECK | `length(proposed_text) <= 5000` |

## Indexes

| Index | Purpose |
|---|---|
| `(source_table, source_id, status)` | "show suggestions for this task" |
| `(status, created_at DESC)` WHERE `status = 'pending'` | admin review queue |
| `(suggested_by_user_id, created_at DESC)` | user's suggestion history |
| `(reviewed_by_user_id, reviewed_at DESC)` WHERE `reviewed_by_user_id IS NOT NULL` | admin review history |

## Rules

- **Polymorphic source** lets the same table cover suggestions for any task type. New task tables (future) plug in by reusing `source_table` + `source_id`.
- **`accepted` does NOT auto-apply** the change. Admin still has to copy the proposed text into the task. The status flip is an audit signal, not an automatic mutation. (V2.1 could automate this with a function, but keep manual for now to avoid accidental task corruption.)
- **`superseded`** is for when the same field on the same task has multiple competing suggestions; admin marks earlier ones superseded by a chosen newer one.
- **No reward** for submitting suggestions in V2 — pure quality contribution. Future: small XP grant on `accepted`.
- **Notifications:**
  - On `accepted` / `rejected` → notify `suggested_by_user_id` (`category = 'system'`, type = TBD; can reuse a generic `announcement` for now)

## RLS

| Operation | Policy |
|---|---|
| SELECT | suggester reads their own; admins read all |
| INSERT | only via SECURITY DEFINER `submit_task_edit_suggestion` RPC (which checks rate limit). RLS denies direct INSERT — single write path is the contract. |
| UPDATE | only via SECURITY DEFINER admin RPC (`review_task_edit_suggestion`) |
| DELETE | not exposed |
