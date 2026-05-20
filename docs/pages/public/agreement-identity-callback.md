# Agreement Identity Callback — `/agreement/identity-callback`

> The Dokobit return target. Orchestrates eID → PDF → signing session, then redirects to Dokobit's signing UI.

## Purpose

Dokobit's `return_url` after a successful PIN1 lands the student back
here with the same `session_token` we minted in `/api/agreements/submit-form`.
This page is the orchestration: verify eID actually completed, lock the
student's identity on the draft row, render the contract PDF via n8n,
upload it to Dokobit, create a signing session, and 302 the student into
the Dokobit signing UI so they can PIN2.

## What it does

- Reads `session_token` from the query string. Missing → redirects to `/`.
- Looks up the draft row by `dokobit_auth_token = session_token`.
- If a Dokobit signing session is already attached and the row is past
  `awaiting_student_signature`, short-circuits and returns the existing
  signing UI URL (idempotent — Dokobit replays the callback on browser-
  back).
- Otherwise calls `getAuthStatus`, then `scholarship_record_identity`
  (which throws `scholarship_identity_mismatch` if the personal code
  doesn't match a previous attempt on the same draft, or hits the
  cross-program unique index if the same person already signed the
  other scholarship variant).
- Renders the contract PDF (`renderContractPdf` → `n8n` render webhook).
- Uploads the unsigned PDF to Supabase Storage (`scholarship-documents`
  bucket) and to Dokobit (`file/upload.json`).
- Creates a single-signer Dokobit signing session.
- Persists the signing tokens via `scholarship_record_signing_session`.
- Redirects to the Dokobit hosted signing UI.

While all of that runs (5-15 seconds), Next.js streams `loading.tsx`
which shows a spinner and a "Preparing your contract…" message so the
student doesn't see a blank page.

## How it looks

The loading state is a centred small card with an animated spinner, a
heading, and a one-sentence reassurance. On success the page never
actually renders content — it always finishes by returning a redirect.
On error it renders one of three error cards:

- `auth_not_complete` — Dokobit eID didn't actually succeed.
- `identity_mismatch` — the lock is held by a different personal code.
- Generic fallback — anything unexpected (n8n down, Dokobit upload
  failed, storage failed). Includes an `info@startschool.org` mailto.

## Thought behind it

The heavy logic (PDF render, two Dokobit calls, two DB writes) lives in
a pure typed helper (`completeIdentityAndCreateSigning`) that is also
reused by the admin retry endpoint. The page is a thin orchestrator —
its main job is mapping errors to user-facing messages and streaming the
loading state.

The Dokobit session token doubles as our correlation key — no separate
access token in our URL, no PII in the URL, and the row is invisible to
anyone who doesn't already possess the token Dokobit handed us.

## Wired-up bits

- **Page file:** [`src/app/agreement/identity-callback/page.tsx`](../../../src/app/agreement/identity-callback/page.tsx)
- **Loading:** [`src/app/agreement/identity-callback/loading.tsx`](../../../src/app/agreement/identity-callback/loading.tsx)
- **Helper:** [`src/lib/scholarship/complete-identity.ts`](../../../src/lib/scholarship/complete-identity.ts) — orchestration; reused by admin retry
- **External calls:** Dokobit `getAuthStatus`, `file/upload.json`, `signing/create.json`; n8n render-pdf webhook
- **Storage:** Supabase bucket `scholarship-documents`, path `unsigned/{id}.pdf`

Last verified against code: 2026-05-20
