# Scholarship Agreements — `/dashboard/admin/agreements`

> Admin operations surface: view the queue, batch-countersign with one PIN, cancel, retry, download.

## Purpose

Once students start submitting forms, admin needs a single place to
review the queue, countersign signed contracts (in bulk if possible),
keep tabs on stuck rows, and download the final `.edoc` when needed.
This page is that single place. No editing of student data — by design;
the audit trail in the event log is the source of truth.

## What it does

- Lists every scholarship agreement, newest first, with status badge,
  type, created date, and student-signed date.
- Multi-select via checkbox column — but only `student_signed` rows are
  eligible (checkboxes disabled on every other status). Header checkbox
  selects/deselects all eligible rows, capped at the Dokobit batch limit
  of 20 per click.
- "Sign N selected" toolbar button opens the bulk-sign dialog with two
  paths:
  - **Batch (eParaksts / ID card):** one PIN signs all N. Backed by
    `POST /api/agreements/admin/sign-batch` → Dokobit `createbatch.json`.
  - **Sequential (Smart-ID):** opens N tabs, one per doc, each pointing
    at the single-doc signing UI. Smart-ID protocol mandates a PIN per
    transaction; no way around it.
- Click any row → detail modal with:
  - Live realtime updates (Supabase postgres_changes channel on the row
    and the events table — admin sees status flip as soon as the
    Dokobit postback lands, no F5).
  - Per-status action buttons: Sign-as-school (for awaiting_school_signature
    on the Smart-ID path), Retry PDF + signing (for identity_verified
    or failed), Download signed (for archived), Cancel (everything but
    archived/cancelled).
  - Full event timeline.

## How it looks

A standard admin-page header (page title + supporting text), the
right-aligned bulk "Sign N selected" CTA, then a ShadCN `<Table>` of
rows. The status badges follow the colour scheme: zinc for draft,
amber for awaiting actions, blue for student_signed, emerald for
school_signed/archived, rose for cancelled/failed. The detail modal is
a wide dialog with a status row, key fields in a 2-column grid, an
action button cluster, and the vertical event timeline.

## Thought behind it

The page intentionally collapses the "batch vs one-by-one" decision into
a single button + dialog rather than two separate flows. That removes
the cognitive load of "which one do I have today" when the admin gets a
new ID card or moves between countries. The detail modal is the only
place that allows admin-initiated mutations, and even there the only
edits are status transitions, never row data — because the row data is
either the student's input or Dokobit's eID claim, both of which are
out of admin's hands by design.

The realtime subscription on the detail modal is what closes the
feedback loop after a Dokobit batch: admin signs in another tab, the
postback flips status, and the modal updates without manual reload.

## Wired-up bits

- **Page file:** [`src/app/dashboard/admin/agreements/page.tsx`](../../../src/app/dashboard/admin/agreements/page.tsx)
- **Key components:**
  - [`AgreementsTable`](../../../src/components/scholarship/AgreementsTable.tsx) — table with selection
  - [`BulkSignDialog`](../../../src/components/scholarship/BulkSignDialog.tsx) — batch vs sequential picker
  - [`AgreementDetailModal`](../../../src/components/scholarship/AgreementDetailModal.tsx) — detail + realtime + actions
  - [`StatusBadge`](../../../src/components/scholarship/StatusBadge.tsx) — colour-coded pill
- **API consumed:**
  - `GET /api/agreements/admin` — list with filters
  - `GET /api/agreements/admin/[id]` — detail + events
  - `PATCH /api/agreements/admin/[id]` — cancel
  - `GET /api/agreements/admin/[id]/sign-single` — Smart-ID URL
  - `POST /api/agreements/admin/sign-batch` — eParaksts/card batch
  - `POST /api/agreements/admin/[id]/retry` — recover stuck
  - `GET /api/agreements/admin/[id]/download` — signed URL (60s TTL)
- **Auth:** client-side `useApp()` redirect + server-side `requireAdmin()`
  on every API route.

Last verified against code: 2026-05-20
