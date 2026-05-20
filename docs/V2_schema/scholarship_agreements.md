# `scholarship_agreements`

Per-student scholarship contract row. Pre-cohort: students may not yet be
platform users. Created in `draft` after the student submits the form on
either `/full-scholarship-agreement` or `/partial-scholarship-agreement`
AND a Dokobit auth session has been minted — the Dokobit `session_token`
is stored in `dokobit_auth_token` and is the row's correlation key
through the identity callback (no separate access token).

This table is intentionally NOT cohort-scoped — an exception to V2 rule
"every row carries cohort_id" since contracts are signed before cohort
assignment. Documented in [invariants.md](invariants.md).

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `agreement_type` | enum `scholarship_agreement_type` | NO | — | `full`, `partial` |
| `recipient_email` | text | NO | — | from student form, length 3..320 |
| `recipient_phone` | text | NO | — | from student form, length 4..32 |
| `recipient_address` | text | NO | — | from student form, length 4..500 |
| `signer_personal_code` | text | YES | — | from Dokobit eID; locked after first verify |
| `signer_country_code` | text | YES | — | from Dokobit eID |
| `signer_name` | text | YES | — | from Dokobit eID |
| `signer_surname` | text | YES | — | from Dokobit eID |
| `identity_verified_at` | timestamptz | YES | — | first successful eID lock |
| `language` | enum `scholarship_agreement_language` | NO | `'en'` | `lv`, `en` |
| `dokobit_auth_token` | text | YES | — | session_token from Identity Gateway; row correlation key |
| `dokobit_signing_token` | text | YES | — | signing session token from Documents Gateway |
| `dokobit_signer_token` | text | YES | — | student's signer access token |
| `dokobit_school_signer_token` | text | YES | — | school's signer access token (single-doc path) |
| `dokobit_batch_token` | text | YES | — | batch token (eParaksts/card admin path) |
| `unsigned_pdf_path` | text | YES | — | Supabase Storage path under `scholarship-documents/unsigned/` |
| `signed_doc_path` | text | YES | — | Supabase Storage path under `scholarship-documents/signed/` |
| `status` | enum `scholarship_agreement_status` | NO | `'draft'` | see flow diagram |
| `status_reason` | text | YES | — | populated by `scholarship_cancel` |
| `student_signed_at` | timestamptz | YES | — | student PIN2 timestamp |
| `school_signed_at` | timestamptz | YES | — | school PIN2 timestamp |
| `archived_at` | timestamptz | YES | — | final `.edoc` archive timestamp |
| `expires_at` | timestamptz | NO | — | abandonment cutoff; cron-driven |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | trigger-maintained |

## Enums

| Enum | Values |
|---|---|
| `scholarship_agreement_type` | `full`, `partial` |
| `scholarship_agreement_language` | `lv`, `en` |
| `scholarship_agreement_status` | `draft`, `identity_verified`, `awaiting_student_signature`, `student_signed`, `awaiting_school_signature`, `school_signed`, `archived`, `cancelled`, `expired`, `failed` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| CHECK | `length(recipient_email) between 3 and 320` |
| CHECK | `length(recipient_phone) between 4 and 32` |
| CHECK | `length(recipient_address) between 4 and 500` |

## Indexes

| Index | Purpose |
|---|---|
| `(status, expires_at)` | Cron sweep for `expire_pending` |
| `(recipient_email)` | Admin search |
| `(dokobit_auth_token) WHERE NOT NULL` | Identity-callback lookup |
| `(dokobit_signing_token) WHERE NOT NULL` | Webhook handler lookup |
| `(dokobit_batch_token) WHERE NOT NULL` | Batch postback fan-out |
| `(signer_personal_code, agreement_type) UNIQUE WHERE signer_personal_code IS NOT NULL AND status NOT IN ('cancelled','expired','failed')` | **Anti-cheat**: one non-terminal contract per real person per type |

## Triggers

| Trigger | When | Purpose |
|---|---|---|
| `trg_scholarship_agreements_updated_at` | BEFORE UPDATE | maintain `updated_at` |

## Rules

- App code NEVER UPDATEs this table directly. Every write goes through
  the RPCs documented in [`docs/documentation/scholarship-agreements.md`](../documentation/scholarship-agreements.md).
- `ROW LEVEL SECURITY` is `ENABLED` and `FORCED`. Two SELECT policies
  exist for the admin queue page's Realtime channel; zero
  INSERT/UPDATE/DELETE policies for any role.
- Status transitions are enforced server-side by the RPCs (each UPDATE
  has a `WHERE status = '...'` guard) and mirrored client-side in
  [`src/lib/scholarship/state-machine.ts`](../../src/lib/scholarship/state-machine.ts).
- The append-only event log is on [`scholarship_agreement_events`](scholarship_agreement_events.md);
  this table never tries to be its own audit trail.

## Derived (NOT columns on this table)

| Concern | Source |
|---|---|
| Event timeline | `scholarship_agreement_events` |
| Documents | Supabase Storage bucket `scholarship-documents` (private) |
| First name display | Parsed from `signer_name` in UI helpers |
