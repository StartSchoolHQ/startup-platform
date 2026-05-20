# `scholarship_agreement_events`

Append-only event log for scholarship agreements. Every state transition,
every error during retry, every Dokobit postback dispatch writes a row
here. Together with `scholarship_agreements` it forms the audit trail
the admin sees in the detail modal's timeline view.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `agreement_id` | uuid | NO | — | FK → `scholarship_agreements(id)` ON DELETE CASCADE |
| `event_type` | enum `scholarship_event_type` | NO | — | |
| `payload` | jsonb | YES | — | raw event/error context; e.g. `{"reason": "..."}` for cancel, `{"personal_code": "...", "country_code": "..."}` for identity_verified |
| `occurred_at` | timestamptz | NO | `now()` | |

## Enums

| Enum | Values |
|---|---|
| `scholarship_event_type` | `form_submitted`, `identity_started`, `identity_verified`, `identity_mismatch`, `signing_created`, `signer_signed`, `school_signer_added`, `signing_completed`, `archived`, `email_completed_sent`, `cancelled`, `expired`, `error` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `agreement_id` → `scholarship_agreements(id)` ON DELETE CASCADE |

## Indexes

| Index | Purpose |
|---|---|
| `(agreement_id, occurred_at desc)` | Per-agreement timeline (admin detail modal) |
| `(event_type, occurred_at desc)` | Aggregate queries (e.g. how many mismatches this month) |

## Triggers

| Trigger | When | Purpose |
|---|---|---|
| `trg_scholarship_events_no_update` | BEFORE UPDATE | raise `scholarship_agreement_events is append-only` |
| `trg_scholarship_events_no_delete` | BEFORE DELETE | same — log is immutable |

Cascading DELETE from the parent table is allowed (the trigger fires
only on direct DELETE statements, not on cascades).

## Rules

- **Append-only.** UPDATE and DELETE are blocked by the triggers above.
  The only way to drop rows is to delete the parent `scholarship_agreements`
  row (cascade).
- All inserts happen via `scholarship_record_event` or the transitioning
  RPCs in [`scholarship_agreements`](scholarship_agreements.md). App
  code never INSERTs directly.
- Caveat: `identity_mismatch` events emitted by `scholarship_record_identity`
  are rolled back along with the rejected attempt because Postgres
  rolls back the entire function on `RAISE EXCEPTION`. Callers that
  need persistent audit of mismatches log them out-of-band via
  `scholarship_record_event('error', { type: 'identity_mismatch' })`.
- `RLS` is `ENABLED` and `FORCED`. One admin SELECT policy exists for
  the realtime channel; zero write policies.
