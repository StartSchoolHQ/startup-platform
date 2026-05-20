# `client_meetings`

Records of meetings teams have with real clients (or prospects). Self-reported by team members, **admin-approved**, and on approval grants XP/points to every active team member at that moment.

This is meaningful business activity for a startup, so reward but verify — admins gate-keep to prevent inflation. Same approval-then-reward pattern as `revenue_streams`.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `team_id` | uuid | NO | — | FK → `teams(id)` ON DELETE CASCADE |
| `submitted_by_user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE SET NULL — team member who logged it |
| `client_name` | text | NO | — | client / company / contact |
| `meeting_date` | date | NO | — | when the meeting happened |
| `meeting_type` | enum `client_meeting_type` | NO | — | `discovery`, `demo`, `pitch`, `follow_up`, `negotiation`, `closing`, `other` |
| `duration_minutes` | int | YES | — | optional |
| `attendees` | jsonb | YES | — | snapshot of which team members attended (array of user_ids and/or names) |
| `summary` | text | NO | — | what happened, outcomes |
| `outcome` | enum `client_meeting_outcome` | YES | — | `interested`, `not_interested`, `closed_deal`, `follow_up_scheduled`, `lost`, `other` |
| `proof_urls` | jsonb | YES | — | optional uploads (Supabase Storage URLs) — meeting notes, screenshots, agreements |
| `status` | enum `client_meeting_status` | NO | `'pending_review'` | `pending_review`, `approved`, `rejected` |
| `reviewed_by_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL — admin |
| `review_feedback` | text | YES | — | admin's note on approve/reject |
| `reviewed_at` | timestamptz | YES | — | |
| `xp_awarded_per_member` | int | YES | — | snapshotted at approval (from `system_config.client_meeting_xp_per_member`) |
| `points_awarded_per_member` | int | YES | — | snapshotted at approval |
| `members_paid_count` | int | YES | — | how many active members received the reward |
| `metadata` | jsonb | YES | — | overflow |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `client_meeting_type` | `discovery`, `demo`, `pitch`, `follow_up`, `negotiation`, `closing`, `other` |
| `client_meeting_outcome` | `interested`, `not_interested`, `closed_deal`, `follow_up_scheduled`, `lost`, `other` |
| `client_meeting_status` | `pending_review`, `approved`, `rejected` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `team_id` → `teams(id)` ON DELETE CASCADE |
| FOREIGN KEY | `submitted_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| FOREIGN KEY | `reviewed_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| CHECK | `(status IN ('approved','rejected')) = (reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL)` |
| CHECK | `(status = 'approved') OR (xp_awarded_per_member IS NULL AND points_awarded_per_member IS NULL AND members_paid_count IS NULL)` |
| CHECK | `xp_awarded_per_member IS NULL OR xp_awarded_per_member >= 0` |
| CHECK | `points_awarded_per_member IS NULL OR points_awarded_per_member >= 0` |
| CHECK | `meeting_date <= CURRENT_DATE` — can't log a meeting in the future |
| CHECK | `proof_urls IS NULL OR (jsonb_typeof(proof_urls) = 'array' AND jsonb_array_length(proof_urls) <= 10 AND pg_column_size(proof_urls) < 8192)` |
| CHECK | `length(summary) BETWEEN 1 AND 5000` |
| CHECK | `pg_column_size(attendees) < 4096` |
| CHECK | `client_name IS NOT NULL AND length(client_name) BETWEEN 1 AND 200` |
| CHECK | `review_feedback IS NULL OR length(review_feedback) <= 2000` |

## Indexes

| Index | Purpose |
|---|---|
| `(team_id, meeting_date DESC)` | team's meeting history |
| `(status, created_at DESC)` WHERE `status = 'pending_review'` | admin review queue |
| `(submitted_by_user_id, created_at DESC)` | submitter history |
| `(meeting_date, status)` WHERE `status = 'approved'` | dashboards / leaderboards of approved meeting activity |
| `(reviewed_by_user_id, reviewed_at DESC)` WHERE `reviewed_by_user_id IS NOT NULL` | admin review history |

## Lifecycle

| Step | Trigger | What happens |
|---|---|---|
| Logged | team member fills form | INSERT row, `status = 'pending_review'`. Optional `proof_urls` upload to Supabase Storage. |
| Reviewed (approved) | admin clicks approve | SECURITY DEFINER function: read XP/points from `system_config`, snapshot them, INSERT one `transactions` row per active `team_members` row (`type = 'meeting_attended'`, `context = 'team'`, `team_id` set, `source_table = 'client_meetings'`, `source_id = this row`). Set `status = 'approved'`, `reviewed_by`, `reviewed_at`, `members_paid_count`. Fire `activity_events` and `notifications` per member. |
| Reviewed (rejected) | admin clicks reject | Set `status = 'rejected'`, `review_feedback`, `reviewed_*`. No transactions. Notify submitter only. |
| Re-submission | submitter edits and re-submits | New row (existing rejected row stays as history). |

## Rules

- **Snapshot rewards** at approval — not at submission. Lets admins tune `system_config` without affecting in-flight reviews.
- **Active member rule:** payouts go to `team_members WHERE left_at IS NULL` at approval time. Members who left don't backfill. Members who join later don't get retroactive payouts.
- **No automatic activity rate-limiting** — admin reviewers are the throttle. If teams spam, that's a strike-worthy pattern (see `team_strikes`).
- **Proof is optional but encouraged.** Stored as Supabase Storage URLs in `proof_urls` jsonb (e.g. `[{"label": "screenshot", "url": "..."}]`).

## RLS

| Operation | Policy |
|---|---|
| SELECT | team members read their own team's meetings; admins read all |
| INSERT | active team members (only for their own team) |
| UPDATE | submitter can edit while `status = 'pending_review'` (small grace period); admins can review via SECURITY DEFINER RPC |
| DELETE | not exposed |

## What's intentionally NOT here

| Concern | Where |
|---|---|
| XP / points changes themselves | `transactions` (linked via `source_id`) |
| Calendar integration | not modeled — admin trusts the date the team self-reports |
| Per-meeting variable rewards | not in V2 — flat `system_config` rate. Future: per-`meeting_type` rewards table. |
