# Partial Scholarship Agreement — `/partial-scholarship-agreement`

> Hidden, shareable landing page for students assigned to the Partial Tuition Scholarship (60% covered, student pays €2000 in two instalments).

## Purpose

Same goal as the full-scholarship page, for the partial variant. Admins
manually email this URL to vetted students. The student reads a summary,
fills the same form, identifies via Dokobit, and signs the partial-
scholarship contract.

## What it does

Identical to the full-scholarship page except the `PublicAgreementCard`
is rendered with `agreementType="partial"`, which:

1. Surfaces the partial-specific terms summary (€2000 tuition split into
   two €1000 instalments due within 14 days of signing and on
   2027-01-31, plus the €500 enrolment fee).
2. Submits `agreement_type: "partial"` to `/api/agreements/submit-form`.
3. Renders the partial-specific contract PDF (template
   `partial-scholarship-en.hbs`) via n8n after eID.

## How it looks

The layout is identical to the full-scholarship page — same card, same
form, same colour palette. Only the heading, terms-summary content, and
the rendered contract differ.

## Thought behind it

Two separate routes (rather than a `?type=partial` query string) make
the robots.txt entries and middleware no-referrer policy clean per path,
and the URL itself becomes the human-readable program marker — easier
for admins to forward without mistakes and easier to reason about in
logs.

## Wired-up bits

- **Page file:** [`src/app/partial-scholarship-agreement/page.tsx`](../../../src/app/partial-scholarship-agreement/page.tsx)
- **Layout (noindex):** [`src/app/partial-scholarship-agreement/layout.tsx`](../../../src/app/partial-scholarship-agreement/layout.tsx)
- **Components:** identical to full-scholarship — see [`PublicAgreementCard`](../../../src/components/scholarship/PublicAgreementCard.tsx)
- **API consumed:** `POST /api/agreements/submit-form`

Last verified against code: 2026-05-20
