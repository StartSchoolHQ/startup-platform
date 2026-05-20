# Agreement Thank-You — `/agreement/thank-you/[id]`

> Confirms the student's PIN2 signature and tells them what's next.

## Purpose

After the student signs in Dokobit, Dokobit returns them to this page.
It's the simple "we got it, school will sign next, watch your inbox"
acknowledgement. The student can close the tab — the rest is async.

## What it does

- Validates `[id]` is a valid UUID; otherwise 404.
- Loads the row via `findById`.
- Verifies status is one of `student_signed`, `awaiting_school_signature`,
  `school_signed`, or `archived` — anything earlier means the student
  shouldn't be on this page, so we redirect them back to the original
  scholarship URL.
- Renders `ThankYouCard` with the first name from the eID-locked
  `signer_name`.

## How it looks

A single centred card. Personalised "Thank you, {first name}!" heading,
one short paragraph explaining the school countersign step and the
email-with-attachment follow-up, and a "You can close this page" hint.

## Thought behind it

Direct navigation to this URL with a guessed id can't bypass anything —
the status check ensures only students who genuinely signed see the
thank-you, others get bounced back to the agreement form. The page
deliberately doesn't say "your contract is binding now" because it
isn't yet — both signatures are required before it's complete.

## Wired-up bits

- **Page file:** [`src/app/agreement/thank-you/[id]/page.tsx`](../../../src/app/agreement/thank-you/[id]/page.tsx)
- **Component:** [`ThankYouCard`](../../../src/components/scholarship/ThankYouCard.tsx)
- **Data:** `findById` from [`src/lib/scholarship/data.ts`](../../../src/lib/scholarship/data.ts)

Last verified against code: 2026-05-20
