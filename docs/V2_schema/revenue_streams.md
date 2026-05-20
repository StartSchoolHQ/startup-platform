# `revenue_streams`

Team-reported revenue events (e.g. first paying client, recurring subscription, contract). User uploads proof, admin approves or rejects. **No XP/points reward** — purely shown on the team card as bragging rights and a signal of startup quality.

Approved revenue is summed live for display: `SUM(amount WHERE status='approved')` per team.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `team_id` | uuid | NO | — | FK → `teams(id)` ON DELETE CASCADE |
| `submitted_by_user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE SET NULL — team member who logged it |
| `amount` | numeric(14,2) | NO | — | money amount; precision sufficient for typical startup revenue |
| `currency` | text | NO | `'EUR'` | ISO 4217 code; default to your primary currency |
| `revenue_type` | enum `revenue_type` | NO | — | `one_time`, `recurring`, `contract`, `grant`, `other` |
| `description` | text | NO | — | what the revenue is from (client / product / contract context) |
| `revenue_date` | date | NO | — | when the revenue was earned/received |
| `proof_urls` | jsonb | NO | `'[]'::jsonb` | array of Supabase Storage URLs for PDFs / images (must be non-empty for submission) |
| `status` | enum `revenue_stream_status` | NO | `'pending_review'` | `pending_review`, `approved`, `rejected` |
| `reviewed_by_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL — admin |
| `review_feedback` | text | YES | — | admin's note on approve/reject |
| `reviewed_at` | timestamptz | YES | — | |
| `metadata` | jsonb | YES | — | overflow |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `revenue_type` | `one_time`, `recurring`, `contract`, `grant`, `other` |
| `revenue_stream_status` | `pending_review`, `approved`, `rejected` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `team_id` → `teams(id)` ON DELETE CASCADE |
| FOREIGN KEY | `submitted_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| FOREIGN KEY | `reviewed_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| CHECK | `amount > 0` |
| CHECK | `currency ~ '^[A-Z]{3}$'` — ISO 4217 format |
| CHECK | `(status IN ('approved','rejected')) = (reviewed_at IS NOT NULL AND reviewed_by_user_id IS NOT NULL)` |
| CHECK | `revenue_date <= CURRENT_DATE` |
| CHECK | `jsonb_array_length(proof_urls) >= 1 AND jsonb_array_length(proof_urls) <= 10` — proof required at submission, capped to prevent UI flooding |
| CHECK | `jsonb_typeof(proof_urls) = 'array'` |
| CHECK | `pg_column_size(proof_urls) < 8192` — 8 KB hard limit on the URL list jsonb |
| CHECK | `length(description) BETWEEN 1 AND 2000` |
| CHECK | `review_feedback IS NULL OR length(review_feedback) <= 2000` |

## Indexes

| Index | Purpose |
|---|---|
| `(team_id, status, revenue_date DESC)` | team card "approved revenue this year" |
| `(status, created_at DESC)` WHERE `status = 'pending_review'` | admin review queue |
| `(submitted_by_user_id, created_at DESC)` | submitter history |
| `(reviewed_by_user_id, reviewed_at DESC)` WHERE `reviewed_by_user_id IS NOT NULL` | admin review history |
| `(team_id, status)` WHERE `status = 'approved'` | leaderboard / discovery |

## Lifecycle

| Step | Trigger | What happens |
|---|---|---|
| Submitted | team member fills form, uploads proof | INSERT row, `status = 'pending_review'`. `proof_urls` array must contain at least one URL. |
| Approved | admin clicks approve | SECURITY DEFINER function sets `status = 'approved'`, `reviewed_*`. **No `transactions` row created.** Fire `activity_events` (`revenue_approved`) and `notifications` to all active team members. |
| Rejected | admin clicks reject | Set `status = 'rejected'`, `review_feedback`, `reviewed_*`. Notify submitter. |
| Re-submission | submitter edits and re-submits | New row (existing rejected row stays). |

## Rules

- **No XP / points reward.** Approval grants visibility on the team card and counts toward leaderboard cosmetic stats (e.g. "Top revenue teams"). The mechanic is reputation, not gamified currency.
- **Snapshotting** isn't needed because no rewards are issued — but `amount` and `currency` are immutable once approved (admin would reject and re-request a corrected submission).
- **Currency aggregation:** when summing for display, the app should group by `currency` or convert via a rate source. V2 keeps this naive — admins should encourage one currency per team or per submission.
- **Proof storage:** files live in Supabase Storage. URLs in `proof_urls` should point to a private bucket; admin UI fetches via signed URLs.
- **Edit window:** submitter can edit while `status = 'pending_review'`. Once reviewed, edits are not allowed; submit a new row.

## Team card display (live derivation)

| Stat | Query |
|---|---|
| Total approved revenue | `SUM(amount) FROM revenue_streams WHERE team_id = X AND status = 'approved' GROUP BY currency` |
| Latest approved revenue | `MAX(revenue_date) WHERE team_id = X AND status = 'approved'` |
| Number of revenue streams | `COUNT(*) WHERE team_id = X AND status = 'approved'` |

## RLS

| Operation | Policy |
|---|---|
| SELECT | team members read their own team's streams; admins read all; **approved** streams visible to all authenticated users (for team card display) |
| INSERT | active team members (only for their own team) |
| UPDATE | submitter can edit while `status = 'pending_review'`; admins via SECURITY DEFINER RPC |
| DELETE | not exposed |

## What's intentionally NOT here

| Concern | Why |
|---|---|
| XP / points reward | None — explicit business decision |
| Recurring schedule modeling | A `recurring` revenue type is logged as separate rows when collected, not as a schedule |
| Currency conversion / FX rate | Out of scope; defer to display layer |
| Refunds / clawbacks | Not modeled — re-submit a corrected row, admin rejects the original |
