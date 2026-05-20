# Full Scholarship Agreement — `/full-scholarship-agreement`

> Hidden, shareable landing page for students assigned to the Full Tuition Scholarship.

## Purpose

StartSchool's full-scholarship students reach this URL via a manually
forwarded email from an admin. The page exists so they can read a
plain-language summary of what they're committing to, fill in the three
fields Dokobit doesn't supply (email, phone, address), confirm their
identity, and sign the contract — without any login, account, or token.

## What it does

- Server-renders the `PublicAgreementCard` with `agreementType="full"`.
- Shows the program terms summary (100% tuition covered, €500 enrolment
  fee, study period 2025-08-26 to 2026-08-29, performance checkpoints).
- Renders the form (`AgreementForm`) — email + confirm email + phone +
  address. Inline field errors. Email mismatch caught client-side and
  on the server as defence-in-depth.
- On submit, POSTs to `/api/agreements/submit-form`. That route mints a
  Dokobit Identity Gateway session, persists a draft row keyed by the
  session token, and returns the redirect URL. The browser navigates
  straight to Dokobit's hosted eID UI.
- Middleware applies `X-Robots-Tag: noindex, nofollow, noarchive` and
  `Referrer-Policy: no-referrer`. The route layout sets the equivalent
  via Next's `<head>` metadata as belt-and-braces.

## How it looks

A single centred card on a clean background. Heading "Full Scholarship
Agreement", short intro paragraph, a soft grey terms-summary block with
bulleted highlights, then the form. The continue button is full-width
with a subtle "Continuing…" disabled state during submit. Below the
card, a small `start@startschool.org` mailto link for support.

## Thought behind it

The page is intentionally minimal because students may be on mobile and
this is the first impression of a legal commitment — clarity beats
density. The form fields are limited to exactly the things Dokobit
cannot give us (contact data + address), keeping friction to the
absolute minimum. The terms summary is in plain English; the full legal
text shows up later as the PDF rendered in Dokobit's signing UI.

The route URL itself is the program-type marker — there's no admin
"create" step, no per-student token, no email automation from our side.
Admins forward whichever URL is appropriate and the student takes it
from there.

## Wired-up bits

- **Page file:** [`src/app/full-scholarship-agreement/page.tsx`](../../../src/app/full-scholarship-agreement/page.tsx)
- **Layout (noindex):** [`src/app/full-scholarship-agreement/layout.tsx`](../../../src/app/full-scholarship-agreement/layout.tsx)
- **Components:**
  - [`PublicAgreementCard`](../../../src/components/scholarship/PublicAgreementCard.tsx)
  - [`ScholarshipTermsSummary`](../../../src/components/scholarship/ScholarshipTermsSummary.tsx)
  - [`AgreementForm`](../../../src/components/scholarship/AgreementForm.tsx)
- **API consumed:** `POST /api/agreements/submit-form`
- **Middleware:** [`src/lib/supabase/middleware.ts`](../../../src/lib/supabase/middleware.ts) — adds X-Robots-Tag + Referrer-Policy on this path prefix
- **robots.txt:** [`public/robots.txt`](../../../public/robots.txt) — `Disallow: /full-scholarship-agreement`

Last verified against code: 2026-05-20
