# Part-time Studies Agreement — Design Spec

**Date:** 2026-06-26
**Status:** Approved
**Branch:** `feature/part-time-agreement`

## Goal

Add a third agreement type, **part-time studies**, that behaves exactly like
the existing `full` and `partial` scholarship agreements: public form → Dokobit
eID → in-app PDF render → student PIN2 → school countersign → archive → email →
data-minimization. The contract text is the StartSchool part-time template
(2026/2027), rendered **verbatim** including its existing typos.

Part-time is **not** a scholarship — the student pays tuition. URL and heading
reflect that.

## Decisions

1. **Birthdate** — the part-time contract says "born on {{Birthdate}}". Nothing
   in the current flow provides a birthdate (Dokobit eID returns only name,
   surname, personal code, country code; the form collects email/phone/address).
   We add a **birthdate field to the form, shown only for part-time**, stored on
   the row, and rendered into the PDF.
2. **URL / heading** — `/part-time-agreement`, heading "Part-time Studies
   Agreement". Not labelled "scholarship".
3. **Module track** — the contract lists both tracks inline (Tech €200/mo,
   Tech+Startup €400/mo) with both Stripe links, exactly as written. The chosen
   track is detected later from the student's Stripe subscription, so nothing is
   captured at signing time. No module-track column, no form selector.
4. **Anti-cheat** — identical to full/partial. The existing
   `(signer_personal_code, agreement_type)` unique index already covers
   `part_time` automatically. No index change (no new mutual-exclusion logic).

## What is reused unchanged

The entire signing engine: Dokobit identity, PDF upload, two-signer session,
the webhook handler, the state machine, school countersign (batch + single),
archive → storage → completion email → data-minimization. The `part_time` enum
value already exists in the DB (migration `20260525200001`). `next.config.ts`
already globs `templates/**/*.hbs`.

## Changes

### Database (new migration — fully additive, applied to prod 2026-06-26)
- `recipient_birthdate date` column (nullable).
- New `scholarship_submit_form_v3` (= v2 + optional `p_birthdate`).
  **`v2` is left untouched** because full/partial links are live with real
  students — zero risk to them. Matches the existing "keep the prior version
  for rollback" pattern.
- `scholarship_minimize_archived` also nulls `recipient_birthdate` (PII).

### Render
- `pdf.ts`: register `part_time: "part-time-en.hbs"` in `TEMPLATE_FILES`; add
  optional `birthdate` to `ContractRenderInput`.
- `complete-identity.ts`: format `recipient_birthdate` → `DD.MM.YYYY` and pass
  it into the render input.
- New template `src/lib/scholarship/templates/part-time-en.hbs` — verbatim doc
  text, typos preserved, same CSS/structure as the existing templates. Variable
  mapping: `{{Fullname}}`→`{{signer.name}} {{signer.surname}}`,
  `{{Personalid}}`→`signer.personal_code`, `{{Birthdate}}`→`birthdate`,
  `{{Address}}`→`recipient_address`, `{{Email}}`→`recipient_email`,
  `{{Phonenumber}}`→`recipient_phone` (printed as `+{{...}}`).

### Form / validation
- `validation-schemas.ts`: add `part_time` to the type enum; add optional
  `birthdate` (ISO `YYYY-MM-DD`), required via `superRefine` when type is
  `part_time`.
- `AgreementForm.tsx`: widen type; render a birthdate date-input only for
  part-time; include it in the submit payload.
- `submit-form/route.ts` + `data.ts` `submitFormV3`: thread `birthdate` to the
  RPC.

### Type wiring
- New `src/app/part-time-agreement/page.tsx` + `layout.tsx` (noindex).
- `PublicAgreementCard.tsx`: widen type; add `part_time` heading.
- `thank-you/[id]/page.tsx`: add `part_time` to `PUBLIC_ROUTE`.
- Admin filter: `admin/route.ts` `ALLOWED_TYPES`, admin page `TYPE_OPTIONS`,
  `AgreementsSummaryCard.tsx` per-type bucket.
- `database.ts`: add `recipient_birthdate` to the table Row/Insert/Update and
  `p_birthdate` to the `submit_form_v2` Args (regenerate on deploy).

### Tests
- Flip `form-schema.test.ts`: `part_time` is now **accepted** (with birthdate),
  and rejected when birthdate is missing.
- Add a golden render test for the part-time template.

## Regression guard

Run the full `tests/scholarship/` suite + `tsc`; the existing full/partial tests
must stay green, and full/partial PDFs render unchanged (birthdate is null and
their templates never reference it).
