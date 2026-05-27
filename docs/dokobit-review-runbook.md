# Dokobit Integration Review — Admin Runbook

The integration review is a 30-60 minute video call (MS Teams, English) in
which Dokobit asks us to demonstrate our sandbox integration end-to-end
and walks through their best-practice checklist. This document is what
you read 30 minutes before the call.

Source: <https://dokobit.support.signicat.com/hc/en-us/articles/20067454837532-Integration-review-and-access-to-the-production-environment>

## Prerequisites before scheduling

1. Dokobit sandbox API keys are issued. `.env.local` populated:
   - `DOKOBIT_IDENTITY_API_KEY`
   - `DOKOBIT_IDENTITY_BASE_URL=https://id-sandbox.dokobit.com`
   - `DOKOBIT_DOCUMENTS_API_KEY`
   - `DOKOBIT_DOCUMENTS_BASE_URL=https://gateway-sandbox.dokobit.com`
2. Production contract with Dokobit is signed (their gate, not ours).
3. You have completed the sandbox E2E once on the `develop` branch.

Email `developers@dokobit.com` to schedule the call only after all three
are true.

## Before the call (T-30 min)

- [ ] `npm run dev` running locally, dev server reachable
- [ ] An admin browser tab open at `/dashboard/admin/agreements`
- [ ] A second browser profile open at `/full-scholarship-agreement`
      (private window or different profile — must not share auth state
      with the admin tab)
- [ ] Smart-ID demo PIN handy (test numbers list Dokobit sent with the keys)
- [ ] Sentry tab open in another window — to show error visibility
- [ ] Supabase SQL editor open on the `scholarship_agreements` table
- [ ] This runbook, the privacy notice
      (`/privacy/scholarship-agreement`), and `src/lib/dokobit/README.md`
      open in side tabs as ready references

## The demo (what to show, in order)

The reviewer wants to see the full WYSIWYS-compliant flow end-to-end.
Follow this script. Narrate as you go.

### 1. Public form (90 seconds)

1. Open `/full-scholarship-agreement` in the student browser.
2. Point out: heading, plain-language terms summary, privacy notice
   summary, the form fields, Mobile-ID + Smart-ID brand marks below the
   "Continue" button.
3. Mention briefly: privacy notice is also linked above the button; the
   route has `X-Robots-Tag: noindex, nofollow, noarchive` and
   `Referrer-Policy: no-referrer` (set in `middleware.ts`).
4. Fill: `test_demo@example.com` (twice), `+371 20000000`, a real-looking
   address.
5. Click **Continue to identity check**.

### 2. Dokobit Identity Gateway (60 seconds)

1. Land on the hosted picker. Note the supported methods.
2. Pick **Smart-ID**. Enter the demo personal code.
3. Confirm the control code matches the one shown in the Smart-ID DEMO
   app (this is the WYSIWYS principle in action for authentication —
   the user sees what they're authenticating).
4. Enter PIN1.
5. Get redirected back to `/agreement/identity-callback?session_token=…`
   — a brief loading state appears (Next.js streams `loading.tsx` while
   the server-component orchestration runs).

### 3. Contract render + signing session (~5 seconds)

The user doesn't see the internals, but it's worth narrating:

- We call `getAuthStatus` to re-verify the eID session.
- We lock identity to the row (`scholarship_record_identity`) — if the
  same person retries an abandoned attempt, the old draft is cancelled
  as `superseded_by_retry`; if they've already signed, they see "You've
  already signed this agreement" instead of a confusing mismatch.
- We render the contract HTML via Handlebars (lawyer-approved template
  in `src/lib/scholarship/templates/full-scholarship-en.hbs`).
- HTML is rendered to PDF in-process via puppeteer-core + @sparticuz/chromium.
- We upload the PDF to Dokobit (`/api/file/upload.json`) with a
  filename like `Jānis_Bērziņš_Full_Scholarship_Agreement.pdf`.
- We create a signing session (`/api/signing/create.json`) with
  `signing_purpose: "signature"` and `signing_options` set on the
  signer object.
- We redirect to Dokobit's hosted signing UI.

### 4. Documents Gateway signing (90 seconds)

1. The student sees the PDF preview. **Point at the document preview**:
   WYSIWYS principle — the student can review the exact PDF before
   committing.
2. **Point at the cancel button** — student can abort the transaction.
3. **Point at the control code** — clearly displayed before PIN2.
4. Enter PIN2 in Smart-ID DEMO.
5. Wait for redirect to `/agreement/thank-you/{id}`. Show the thank-you
   card explaining the school countersign is next.

### 5. Webhook + admin queue (60 seconds)

1. Switch to the admin browser tab. Hit **Refresh** on
   `/dashboard/admin/agreements`.
2. The row appears in **Signed by student / Awaiting school signature**.
   Filter by that status with the dropdown to show the search works.
3. Point out: the row carries student name and email, no other PII (the
   detail modal would show identity-locked fields).
4. Note: behind the scenes the webhook re-verifies status via
   `getSigningStatus` before mutating, then calls `addSigner` to attach
   the school as the second signer.

### 6. School countersign — batch path (60 seconds)

1. Select the row's checkbox. The "Sign 1 selected" button enables.
2. Click it. The `BulkSignDialog` opens with two options.
3. Pick **Batch (eParaksts / ID card)** — one PIN signs up to 20 docs at
   once. (For Smart-ID admins, the **Sequential** path opens N tabs.)
4. Click "Sign with eParaksts / ID card".
5. Dokobit's hosted batch signing UI opens in a new tab.
6. Enter the admin's PIN (test smartcard / eParaksts demo).
7. Tab closes / shows success. Webhook fires `signer_signed` →
   `signing_completed` → we `archiveSigning`, upload `.edoc` to
   Supabase Storage, email the student.

### 7. Admin queue post-archive (30 seconds)

1. Refresh the admin queue. Row now shows **Archived**.
2. Open the detail modal. Note what survives minimization:
   `signer_name`, `signer_surname`, `recipient_email`, `signed_doc_path`
   — enough for the queue to be useful. **Everything else is wiped**:
   phone, address, personal code, country code, every Dokobit token,
   the unsigned PDF path.
3. Show the `data_minimized` row in the events log
   (`scholarship_agreement_events` table in Supabase).

## Likely reviewer questions

| Question | Answer |
|---|---|
| Where is the API access token stored? | Server-side only, in environment variables (`DOKOBIT_IDENTITY_API_KEY` / `DOKOBIT_DOCUMENTS_API_KEY`). Never in client bundles, never in git (`.env.example` ships placeholders only). |
| How do you handle errors from our API? | Every Dokobit response is Zod-validated. Non-2xx responses throw `DokobitError(message, status, body)` at the wrapper boundary. The documented user-actionable codes (6001 / 6005-6008 / 7023) are mapped to friendly user-facing copy in `src/lib/dokobit/errors.ts`; unhandled codes show a generic "try again, contact support" message. See `tests/scholarship/dokobit-errors.test.ts`. |
| Do you poll our status endpoints? | No client-side polling. The webhook fires once per Dokobit event; we call `getSigningStatus` exactly once inside the webhook to re-verify the postback (defends against replay / forgery). |
| What's the postback security model? | Optional IP allowlist via `DOKOBIT_POSTBACK_ALLOWLIST`. Empty in sandbox (permissive), populated with Dokobit's production IPs after the review. Every webhook also re-verifies state via `getSigningStatus` before mutating, so a replayed postback is a no-op. |
| How do you handle batch signing? | `createBatch` accepts up to 20 signings, each as a `{token, signer_token}` pair (the school's `addSigner` token from each individual signing). Smart-ID is excluded from batch because Smart-ID protocol requires one PIN per signature; we fall back to a sequential per-doc UI for Smart-ID admins. |
| How is the WYSIWYS principle handled? | The signing UI is your hosted Dokobit page, so we delegate WYSIWYS to you — document preview, control code, cancel button are all on Dokobit's screen. We don't reimplement any of that. |
| Data retention? | Drafts that don't reach identity verification are reaped after 14 days by a daily cron. Once both parties sign, `scholarship_minimize_archived` runs and nulls every PII column on the row except `signer_name`, `signer_surname`, `recipient_email` (needed for the admin queue). The `.edoc` itself is kept for the contract duration + 3 years (LV civil-claim limitation). |
| What logging do you keep? | `scholarship_agreement_events` is an append-only audit log with row-level events (form_submitted, identity_started, identity_verified, signer_signed, school_signer_added, archived, data_minimized, etc.). Sentry catches exceptions in production. |
| Localisation? | English-only by project policy. `language: "en"` is hardcoded on `createAuthSession` and `createSigning`. |

## Edge cases to demonstrate if asked

- **Student abandons mid-eID**: open form again with the same email. Row
  with the same `personal_code` in `draft` state gets auto-cancelled as
  `superseded_by_retry`. New attempt succeeds.
- **Student tries the link they already signed**: route shows
  "You've already signed this agreement. Check your inbox."
- **Wrong person opens the link**: route shows "This link belongs to
  another person." (The same partial unique index that catches retry
  also catches genuine impersonation attempts.)
- **PDF render fails mid-flow**: row sits at `identity_verified` or
  `failed`. Show the admin "Retry PDF + signing" action on the detail
  modal — re-runs the render and Dokobit upload using the stored auth
  token.

## After the review

If we pass, Dokobit emails:

- Production `DOKOBIT_IDENTITY_API_KEY` and `DOKOBIT_DOCUMENTS_API_KEY`
- Production base URLs (likely `id.dokobit.com` and
  `gateway.dokobit.com`)
- The list of postback source IPs to put in `DOKOBIT_POSTBACK_ALLOWLIST`

Switchover checklist:

1. Take a manual Supabase backup (CLAUDE.md mandates this for any
   production change).
2. Add the production secrets in Vercel (and any other env) — never
   commit to git.
3. Update `DOKOBIT_*_BASE_URL` to the production hosts.
4. Populate `DOKOBIT_POSTBACK_ALLOWLIST` with the IPs Dokobit provided.
5. Set the Dokobit-side branding in the API Dashboard (logo, primary
   colour, optional public CSS URL).
6. Smoke-test with a single full-scholarship dry run before promoting
   the URLs.
7. Hand the public agreement URLs to the admins who own student
   onboarding.

If we fail the review, Dokobit emails the issues; we address them and
ask for a re-review. The same demo flow applies.

## What to NOT do during the demo

- Don't share the screen with sensitive personal data — use the
  `test_demo@example.com` / Smart-ID DEMO credentials Dokobit issued.
- Don't open `.env.local` — answer key-storage questions verbally.
- Don't switch tabs to the production Supabase — the entire demo runs
  against the sandbox stack and the develop branch.
- Don't promise feature work mid-call. If the reviewer asks for a
  change, note it down, agree to follow up, move on.

## Files to keep handy

- `src/lib/dokobit/README.md` — wrapper overview
- `docs/documentation/scholarship-agreements.md` — full flow / state
  machine / GDPR section
- `src/lib/scholarship/templates/full-scholarship-en.hbs` —
  lawyer-approved template (to show clauses if asked)
- This runbook
