# Scholarship Agreement Signing — Design Spec

**Date:** 2026-05-20
**Status:** Draft, awaiting user review
**Author:** Pair-designed with Claude
**Branch target:** `develop`

---

## 1. Goal

Let StartSchool issue legally binding scholarship contracts (full or partial) to
incoming students through two hidden public URLs. The student identifies
themselves with Latvian eID (Smart-ID / eParaksts mobile), reviews a
pre-filled contract, and signs with PIN2. Afterwards the school signs from the
admin panel and the final `.edoc` is emailed to the student.

No platform user account or invitation is created as part of this flow. This
module produces a signed document — nothing more.

## 2. User-visible flow

1. **Admin** opens `/dashboard/admin/agreements`, clicks *New agreement*, fills:
   - Recipient email
   - Recipient first + last name (optional, for display before eID confirms it)
   - Agreement type: `full` | `partial`
   - Language: `lv` (only language in v1)
   - Payment terms (structured fields — see §6)
   - Optional override of the 14-day default expiry
2. Backend creates a `scholarship_agreements` row, generates a 32-byte CSPRNG
   token (base64url), and POSTs to the n8n *send-invite-email* webhook with
   `{recipient_email, link, language, agreement_type, recipient_first_name}`.
3. Student receives an email containing
   `https://startup.startschool.org/full-scholarship/{token}` or
   `https://startup.startschool.org/partial-scholarship/{token}`.
4. Student clicks. Server-rendered page shows:
   - Greeting with their name
   - One-line summary ("This is your full-scholarship agreement for
     StartSchool")
   - One button: **Apstiprināt identitāti un parakstīt**
5. Click → backend opens a Dokobit Identity session → redirects browser to
   the Dokobit hosted auth URL. Student picks Smart-ID or eParaksts mobile and
   enters PIN1.
6. Dokobit redirects back to `/agreement/identity-callback?session_token=…`.
   Backend fetches the auth status from Dokobit, captures `name`, `surname`,
   `personal_code`, `country_code`. Locks the agreement to that
   `personal_code` (any other person hitting this token afterwards → 403).
7. Backend renders the appropriate HTML template with the eID data + payment
   terms, posts it to the n8n *html-to-pdf* webhook, receives the PDF buffer,
   uploads it to Dokobit (`POST /api/file/upload.json`), creates a signing
   session with the student as the sole signer in the initial create call.
8. Browser is redirected to Dokobit's hosted signing UI
   (`/signing/{token}?access_token={signer_token}`). Student reviews the
   filled contract, presses Sign, enters PIN2.
9. Dokobit fires a `signer_signed` postback to our `/api/webhooks/dokobit`
   handler. Backend re-fetches signing status to confirm, then:
   a. Calls `addsigner.json` to add the school signer.
   b. Sets agreement status to `awaiting_school_signature`.
   c. Redirects (via the Dokobit return param set on the signing UI) to
      `/agreement/thank-you/{token}`.
10. Thank-you page shows: "Paldies! Tavs paraksts ir saņemts. Tālāk šo līgumu
    parakstīs StartSchool vadība, un Tu saņemsi pilnībā parakstītu kopiju savā
    e-pastā." + next-steps copy (TBD with boss for exact wording).
11. **School admin** opens the agreement detail in the admin panel, clicks
    *Sign as school*. Backend returns the Dokobit signing URL with the
    school's signer access token. Admin signs in Dokobit's UI with their own
    eParaksts/Smart-ID + PIN2.
12. Dokobit fires `signing_completed` postback. Backend calls
    `archive.json`, downloads the `.edoc`, stores it in Supabase Storage
    (`scholarship-documents/signed/{agreement_id}.edoc`), POSTs to the n8n
    *send-completed-email* webhook with the file attached. Status →
    `archived`. Done.

## 3. Architecture

### 3.1 Dokobit products used

| Product | Sandbox host | Purpose |
|---|---|---|
| Identity Gateway | `id-sandbox.dokobit.com` | Step 5–6 (eID, returns personal data) |
| Documents Gateway | `gateway-sandbox.dokobit.com` | Steps 7–12 (upload, sign, archive) |

Production hosts are different and require a paid contract with Dokobit. The
two API keys live as `DOKOBIT_IDENTITY_API_KEY` and
`DOKOBIT_DOCUMENTS_API_KEY` env vars.

### 3.2 n8n workflows

Three webhooks, all owned by n8n, called by our backend with a shared secret
header (`X-StartSchool-Signature`):

| Webhook | Input | Output |
|---|---|---|
| `n8n/scholarship/send-invite-email` | `{recipient_email, recipient_first_name, link, language, agreement_type}` | `{ok: true}` |
| `n8n/scholarship/render-pdf` | `{template_id: "full" \| "partial", language: "lv", data: {…fields…}}` | PDF binary |
| `n8n/scholarship/send-completed-email` | `{recipient_email, recipient_first_name, language, signed_doc_base64, signed_doc_filename}` | `{ok: true}` |

Why n8n owns these: the StartSchool domain is on Wix; Resend can't be wired
up. n8n is already deployed and can send mail through Wix SMTP. PDF rendering
is offloaded to n8n's HTML-to-PDF integration so we don't ship a headless
browser inside Vercel serverless functions.

### 3.3 Module layout

```
src/
  app/
    full-scholarship/[token]/page.tsx         server component
    full-scholarship/[token]/sign-button.tsx  client component
    full-scholarship/[token]/layout.tsx       noindex meta + minimal chrome
    partial-scholarship/[token]/…             same shape
    agreement/identity-callback/page.tsx      Dokobit return target
    agreement/thank-you/[token]/page.tsx      step-10 screen

    api/
      agreements/[token]/start-identity/route.ts
      agreements/[token]/identity-complete/route.ts
      agreements/admin/route.ts                 GET list, POST create (admin only)
      agreements/admin/[id]/route.ts            GET detail, PATCH (cancel/resend) (admin only)
      agreements/admin/[id]/sign-as-school/route.ts (admin only)
      agreements/admin/[id]/download/route.ts  signed-URL for final .edoc (admin only)
      webhooks/dokobit/route.ts                postback handler

    dashboard/admin/agreements/page.tsx        list + create dialog

  lib/
    dokobit/
      client.ts        fetch wrapper, error mapping, retry
      identity.ts      createAuthSession, getAuthStatus
      signing.ts       uploadFile, createSigning, addSigner, getStatus, archive
      types.ts         Zod schemas for responses + webhook payloads
    scholarship/
      data.ts          DB ops, single source of truth for state transitions
      state-machine.ts allowed-transition guard
      tokens.ts        generate, validate, lock-to-personal-code
      n8n.ts           wrappers for the three n8n webhooks
      pdf.ts           renderHtml(template, data) → string, then n8n.renderPdf
      templates/
        full-scholarship-lv.hbs
        partial-scholarship-lv.hbs

  components/scholarship/
    AgreementsTable.tsx
    CreateAgreementDialog.tsx
    AgreementDetailModal.tsx
    StatusBadge.tsx
    PublicAgreementCard.tsx
    ThankYouCard.tsx

  middleware.ts        add X-Robots-Tag: noindex,nofollow on these paths

public/
  robots.txt           Disallow: /full-scholarship/, /partial-scholarship/, /agreement/
```

Each file stays under ~200 lines. Templates live as `.hbs` (Handlebars) so a
non-coder can edit copy without touching TypeScript.

## 4. Database

Two new tables. The module is **self-contained**: only one FK leaves the
module (`created_by` → `users.data(id)`) and even that is `ON DELETE SET NULL`
so the agreement survives admin deletion. This is deliberate — the module is
designed to lift-and-shift onto V2 with a single FK target name change. See
§15.

All enums are PostgreSQL enums from day 1 (matches V2's "enum-driven types"
rule, no text columns with CHECK).

```sql
-- Enums (declared first; reused across tables and RPCs)
create type scholarship_agreement_type as enum ('full', 'partial');
create type scholarship_agreement_language as enum ('lv', 'en');
create type scholarship_agreement_status as enum (
  'created','email_sent','link_opened','identity_verified',
  'awaiting_student_signature','student_signed',
  'awaiting_school_signature','school_signed',
  'archived','cancelled','expired','failed'
);
create type scholarship_event_type as enum (
  'created','email_sent','link_opened','identity_started',
  'identity_verified','identity_mismatch','signing_created',
  'signer_signed','school_signer_added','signing_completed',
  'archived','email_completed_sent','cancelled','expired','error'
);

create table scholarship_agreements (
  id                          uuid primary key default gen_random_uuid(),
  agreement_type              scholarship_agreement_type not null,
  recipient_email             text not null,
  recipient_first_name        text,
  recipient_last_name         text,
  language                    scholarship_agreement_language not null default 'lv',
  access_token                text not null unique,

  payment_terms               jsonb not null,

  signer_personal_code        text,
  signer_country_code         text,
  signer_name                 text,
  signer_surname              text,
  identity_verified_at        timestamptz,

  dokobit_auth_token          text,
  dokobit_signing_token       text,
  dokobit_signer_token        text,
  dokobit_school_signer_token text,

  unsigned_pdf_path           text,
  signed_doc_path             text,

  status                      scholarship_agreement_status not null default 'created',
  status_reason               text,

  email_sent_at               timestamptz,
  link_opened_at              timestamptz,
  student_signed_at           timestamptz,
  school_signed_at            timestamptz,
  archived_at                 timestamptz,
  expires_at                  timestamptz not null,

  created_by                  uuid references "users.data"(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  constraint scholarship_agreements_email_len
    check (length(recipient_email) between 3 and 320),
  constraint scholarship_agreements_token_len
    check (length(access_token) between 32 and 128),
  constraint scholarship_agreements_payment_terms_has_variant
    check (payment_terms ? 'variant')
);

create index on scholarship_agreements (status, expires_at);
create index on scholarship_agreements (recipient_email);
create index on scholarship_agreements (created_by);
create index on scholarship_agreements (signer_personal_code)
  where signer_personal_code is not null;

create table scholarship_agreement_events (
  id              uuid primary key default gen_random_uuid(),
  agreement_id    uuid not null references scholarship_agreements(id) on delete cascade,
  event_type      scholarship_event_type not null,
  payload         jsonb,
  occurred_at     timestamptz not null default now()
);

create index on scholarship_agreement_events (agreement_id, occurred_at desc);
create index on scholarship_agreement_events (event_type, occurred_at desc);
```

### 4.1 RLS

Both tables have RLS `ENABLE` + `FORCE`. No policies grant access to `anon`
or `authenticated`. All writes happen via `SECURITY DEFINER` RPCs (§4.4); all
reads go through API routes that use the admin client
(`createAdminClient()`) after verifying either:
- caller is `primary_role='admin'` (admin endpoints), or
- caller holds a valid token in the URL path (public endpoints, where the
  token *is* the authentication).

This matches V2 rule #3 ("All writes through `SECURITY DEFINER`") and #5
("RLS `ENABLE` + `FORCE` on every public table") — no rework needed for V2.

### 4.2 SECURITY DEFINER RPCs

Every state-changing operation runs through a named RPC. App code **never**
INSERTs or UPDATEs these tables directly. Each RPC has
`SET search_path = public, pg_catalog` and the
`REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role`
pattern (admin endpoints use the service role).

| RPC | Caller | Purpose |
|---|---|---|
| `scholarship_create_agreement(p_type, p_email, p_first_name, p_last_name, p_language, p_payment_terms, p_expires_at, p_token, p_created_by)` | `[admin]` | Insert row, status `created`, write `created` event |
| `scholarship_mark_email_sent(p_id)` | `[admin]` (after n8n returns ok) | status → `email_sent` |
| `scholarship_mark_link_opened(p_token)` | `[public]` (token-scoped) | status → `link_opened` (idempotent — only fires once) |
| `scholarship_record_identity(p_token, p_dokobit_auth_token, p_personal_code, p_country_code, p_name, p_surname)` | `[public]` | Sets signer fields, status → `identity_verified`; rejects with `identity_mismatch` event if signer_personal_code already set and differs |
| `scholarship_record_signing_session(p_id, p_signing_token, p_signer_token, p_unsigned_pdf_path)` | `[admin-internal]` | status → `awaiting_student_signature` |
| `scholarship_record_signer_signed(p_signing_token)` | `[webhook]` | status → `student_signed`; called from postback handler after re-verify |
| `scholarship_record_school_signer(p_id, p_school_signer_token)` | `[admin-internal]` | status → `awaiting_school_signature` |
| `scholarship_record_school_signed(p_signing_token)` | `[webhook]` | status → `school_signed`; called from postback handler |
| `scholarship_record_archived(p_id, p_signed_doc_path)` | `[admin-internal]` | status → `archived`, write event |
| `scholarship_record_event(p_id, p_event_type, p_payload)` | `[admin-internal]` | Generic event-only writer for non-transitioning events (e.g. `error`, `email_completed_sent`) |
| `scholarship_cancel(p_id, p_reason)` | `[admin]` | status → `cancelled` (rejected if already archived) |
| `scholarship_expire_pending()` | `[cron]` | Bulk transition expired pending agreements |

Forbidden transitions raise `EXCEPTION 'scholarship_state_transition_denied'`.
The same allowed-transition table is mirrored in
`lib/scholarship/state-machine.ts` so the client knows which buttons to
disable, but the database is the enforcer.

### 4.3 Append-only event log

`scholarship_agreement_events` is append-only — no UPDATE, no DELETE.
Corrections are new rows. Matches V2 rule #8 ("Append-only ledgers").

### 4.4 State machine

```
created
  └─ email_sent          (after n8n invite webhook returns ok)
       └─ link_opened    (server-rendered public page first hit; idempotent)
            └─ identity_verified  (Dokobit auth status returns ok)
                 └─ awaiting_student_signature  (signing session created)
                      └─ student_signed       (Dokobit signer_signed postback)
                           └─ awaiting_school_signature (school signer added)
                                └─ school_signed   (school's signer_signed)
                                     └─ archived  (archive.json + email sent)

any → cancelled  (admin action; only if status NOT IN ('archived'))
any → expired    (cron job; only if status NOT IN ('school_signed','archived','cancelled'))
any → failed     (irrecoverable Dokobit error; admin can retry from 'failed')
```

Transitions live in `lib/scholarship/state-machine.ts` as a single dispatch
table. No transition happens outside `lib/scholarship/data.ts`.

### 4.5 Cron

One job, daily 02:00 UTC, in Supabase `pg_cron`:

```sql
update scholarship_agreements
set status = 'expired', updated_at = now()
where expires_at < now()
  and status not in ('school_signed','archived','cancelled','expired');
```

Sentry alert on failure.

## 5. Security

| Concern | Mitigation |
|---|---|
| Token guessing | 32 bytes from `crypto.randomBytes`, base64url, 256 bits entropy |
| Token sharing across people | After `identity_verified_at IS NOT NULL`, any new eID attempt with a different `personal_code` returns 403 and logs `event_type='identity_mismatch'`. Same person retrying with same code is allowed |
| Token leak via Referer | URL path placement (not query string); plus on the public page we set `Referrer-Policy: no-referrer` |
| Crawler indexing | `public/robots.txt` disallows the three paths; `middleware.ts` adds `X-Robots-Tag: noindex, nofollow, noarchive` on responses for those paths; pages also emit a `<meta name="robots" content="noindex,nofollow,noarchive">` |
| Replay of completed signing | Status check before every transition; archived agreements respond with a "this is already done" view, not the sign button |
| Dokobit postback forgery | Defense in depth: (a) signing_token must match an agreement row, (b) we always re-fetch `signing/{token}/status` from Dokobit before trusting the event, (c) IP allowlist for Dokobit's known IPs in middleware |
| n8n webhook spoofing (inbound) | Shared `X-StartSchool-Signature: hmac-sha256(secret, body)` header. n8n verifies before processing |
| Inbound from n8n to us | Out of scope — n8n only sends emails; it doesn't push state back |
| Storage URL leak | All `.edoc` and PDF access goes through admin-authenticated API routes that mint short-lived (60 s) signed URLs. Bucket itself is private |
| Bulk creation by attacker | Admin endpoints are admin-only; public endpoints can only read/transition an existing token, not create new agreements |

## 6. Contracts and templates

Two `.hbs` files in `lib/scholarship/templates/`:
- `full-scholarship-lv.hbs`
- `partial-scholarship-lv.hbs`

The boss provides each contract as a Word document. Conversion to HBS is a
one-time manual step done before launch — we will:
1. Open the Word doc, copy formatted content.
2. Translate to clean HTML with inline styles (for print fidelity).
3. Replace literal student/payment data with Handlebars placeholders.
4. Render once to verify the PDF looks like the original.

Both templates accept the same `data` shape:

```ts
type ContractData = {
  agreement_type: "full" | "partial";
  signer: {
    name: string;
    surname: string;
    personal_code: string;
    country_code: string;
  };
  payment_terms: PaymentTerms;
  date_today: string;          // formatted "DD.MM.YYYY", server-side
  agreement_reference: string; // e.g. SS-2026-0012, derived from id
};
```

### 6.1 PaymentTerms

Different for each agreement type. Shape:

```ts
type FullScholarshipTerms = {
  variant: "full";
  // full scholarship implies 0 tuition, but commitments differ
  commitments: string[];    // bullet list rendered in contract
  duration_months: number;
};

type PartialScholarshipTerms = {
  variant: "partial";
  total_eur: number;
  installments: Array<{
    amount_eur: number;
    due_date: string;       // ISO date
    label?: string;         // optional human label, e.g. "First installment"
  }>;
  duration_months: number;
  notes?: string;           // free-text appendix in the contract
};

type PaymentTerms = FullScholarshipTerms | PartialScholarshipTerms;
```

Stored as JSONB; admin form has two layouts (one per variant). Zod schema in
`lib/validation-schemas.ts`.

If the actual legal contracts need different fields, this schema and the
admin form are the single point of change — templates reference fields by
name.

## 7. Admin panel

New page `/dashboard/admin/agreements`:

- **Top:** filter bar (status, type, search by email/name).
- **Table:** recipient, type, status (badge), created_at, expires_at,
  last_event, actions menu.
- **Create button** opens a dialog: email, names, type radio, language,
  payment-terms form (variant-aware), expiry override.
- **Row click** opens detail modal showing:
  - Full agreement data
  - Event timeline (from `scholarship_agreement_events`)
  - Buttons: *Copy link*, *Resend invite email*, *Sign as school*
    (only when status = `awaiting_school_signature`), *Download signed doc*
    (only when status = `archived`), *Cancel*.

Admin routes verify `primary_role='admin'` per
`.claude/rules/api-routes.md`. Non-admins get 404 (not 403, to avoid
confirming the route exists).

## 8. Public pages

Server components, minimal chrome (no nav, no footer), branded but stripped
down. Three pages:

- `/full-scholarship/[token]/page.tsx` — fetches by token + type, renders
  `PublicAgreementCard` with greeting and the *Apstiprināt identitāti un
  parakstīt* button. If status forbids it (already signed, expired,
  cancelled), shows the appropriate state message instead.
- `/partial-scholarship/[token]/page.tsx` — identical shape, different type
  filter.
- `/agreement/thank-you/[token]/page.tsx` — shown after the student finishes
  step 9. Reads status; if status is not at least `student_signed`, it
  redirects to the corresponding scholarship URL (defensive — shouldn't
  happen in practice).

All three pages set `Referrer-Policy: no-referrer` and the `noindex` meta.

## 9. Errors and edge cases

| Case | Behaviour |
|---|---|
| Token not found | 404 with neutral message ("This agreement could not be found"). Don't disclose whether token existed |
| Token expired | Status page: "This link has expired. Please contact StartSchool." |
| Token cancelled | Status page: "This agreement has been cancelled. Please contact StartSchool." |
| Token already archived | Status page: "Your signed agreement has been sent to your email. Please check your inbox." |
| Dokobit unreachable | API route returns 503, public page shows retry banner, logs error event |
| eID returns different personal code than locked one | 403 with "This link belongs to someone else. Please contact StartSchool." Event logged |
| Student abandons before PIN1 | Status stays `link_opened`. They can return to the URL and try again (token not yet locked) |
| Student abandons after PIN1 before PIN2 | Status is `awaiting_student_signature` and signing session already exists. We do NOT create a new signing session on retry — we redirect them back to the same Dokobit signing URL using the stored `dokobit_signing_token` + `dokobit_signer_token` |
| School admin tries to sign before student | Button is disabled in UI; API route also rejects with 409 |
| Dokobit archive fails | Status → `failed`, admin sees retry button that re-invokes the archive endpoint |
| PDF rendering fails at n8n | Status stays at `identity_verified`, agreement is "stuck". Admin can resend (which re-triggers PDF render → upload → signing-create). Sentry alert on n8n error |

All errors surfaced to users follow `docs/errors/guidelines.md`: toast or
inline, never `alert()`/`confirm()`.

## 10. Observability

- Every transition writes a row to `scholarship_agreement_events` with the
  raw Dokobit / n8n payload in `payload`.
- Sentry captures any thrown errors in API routes and the cron job.
- PostHog event `scholarship.agreement.{event_type}` for product-side
  analytics (created, opened, signed, archived).

## 11. Out of scope (v1)

- English-language contracts.
- Multiple signers per side (always one student, one school).
- Bulk-creating agreements from CSV.
- Auto-creating platform users from signed agreements.
- Letting students download the signed `.edoc` from a web page (it's emailed;
  if they lose it, admin can resend via the detail modal).
- Editing payment terms after creation (workflow: cancel + new).
- Electronic seal in place of school's human signature.
- Mobile-optimised contract preview (Dokobit's hosted signing UI is already
  mobile-friendly; our pre/post pages will be responsive but the actual
  signing happens in Dokobit).

## 12. Environment variables

```
# Dokobit
DOKOBIT_IDENTITY_API_KEY=
DOKOBIT_IDENTITY_BASE_URL=https://id-sandbox.dokobit.com   # or production
DOKOBIT_DOCUMENTS_API_KEY=
DOKOBIT_DOCUMENTS_BASE_URL=https://gateway-sandbox.dokobit.com  # or production
DOKOBIT_POSTBACK_ALLOWLIST=                                # comma-separated IPs

# n8n
N8N_SCHOLARSHIP_INVITE_URL=
N8N_SCHOLARSHIP_RENDER_PDF_URL=
N8N_SCHOLARSHIP_COMPLETED_URL=
N8N_SCHOLARSHIP_SHARED_SECRET=                             # for HMAC header

# School signer (single person, hard-coded in env)
SCHOOL_SIGNER_NAME=
SCHOOL_SIGNER_SURNAME=
SCHOOL_SIGNER_PERSONAL_CODE=
SCHOOL_SIGNER_COUNTRY_CODE=LV
SCHOOL_SIGNER_EMAIL=
```

## 13. Testing plan

- **Unit:** state machine transitions (all allowed + all forbidden paths),
  token generation/validation, PaymentTerms Zod schemas, contract template
  rendering with golden-snapshot HTML.
- **Integration (sandbox):** full end-to-end on Dokobit sandbox with a test
  Smart-ID account, covering: happy path, abandon-before-PIN1,
  abandon-before-PIN2, retry-after-abandon, identity-mismatch (two different
  test accounts on the same token), expiry, cancel, school-sign.
- **Postback handler:** mock Dokobit POSTs with valid + invalid signing
  tokens; verify re-fetch-and-confirm behaviour.
- **RLS:** confirm `anon` and `authenticated` cannot read or write either
  table directly.
- **Test data prefix:** `test_` for all rows; cleanup in `afterEach`.

## 14. Deployment plan

1. `feature/scholarship-agreements` branch off `develop`.
2. Schema migration applied to develop DB (`supabase migration new …`).
3. Set sandbox env vars in Vercel preview.
4. Build n8n workflows on the existing n8n instance; populate the three
   webhook URLs into env.
5. Author Word → HBS templates, verify PDF render via n8n.
6. End-to-end test on `develop` preview URL with real Smart-ID test account.
7. Boss reviews PDFs and final emails.
8. Contract Dokobit production, set production keys.
9. Merge `feature/…` → `develop`. Test once more on the deployed develop
   preview against Dokobit production.
10. Merge `develop` → `master`. Send the first real invite.

## 15. V2 portability

This module is being built on V1 production but **must lift onto V2 with a
single migration**, because V2 launches with the next cohort and we don't
want to redesign the scholarship flow then.

### 15.1 What's already V2-compatible (by construction)

| Concern | V2 rule | How this module satisfies it |
|---|---|---|
| Enum-driven types (no text-with-CHECK) | rule #1 of conventions | Four module-local enums declared in §4 |
| RLS `ENABLE` + `FORCE` on every public table | rule #5 | Both tables explicitly enabled in migration |
| All writes through `SECURITY DEFINER` RPC with `SET search_path` + REVOKE/GRANT | rule #3, #4 | Every write listed in §4.2 runs through an RPC; app never INSERTs directly |
| Append-only event log | rule #8 | `scholarship_agreement_events` has no UPDATE/DELETE permission |
| No denormalized counters | rule #10 | Status timestamps are facts (not counters); event log is the audit trail |
| Soft delete via status | rule #11 | `cancelled` status; row never DELETEd |
| Idempotent operations | rule #12 | `mark_link_opened` and postback handlers are idempotent on repeated calls |
| Self-contained domain | (architectural posture) | One outbound FK only (`created_by`); no joins into journey/team/cohort tables |

### 15.2 What changes when porting to V2

Estimated effort: **half a day**, mostly migration-file replay against the V2
DB.

| Change | Notes |
|---|---|
| Replay the migration | Drop existing module-local enums + tables in V1 archive; replay the same DDL on V2 |
| `created_by` FK target | V2 keeps `users.data(id)` — no rename needed; just verify the FK target exists |
| RPC registration in `docs/V2_schema/rpcs.md` | Append the 14 RPCs from §4.2 to the V2 RPC catalog with grant-matrix entries (`[admin]`, `[admin-internal]`, `[public]`, `[webhook]`, `[cron]`) |
| RLS policies registration in `docs/V2_schema/rls_policies.md` | Append both tables to the per-table policy table — same deny-all-to-clients posture |
| `users_safe` view exposure | None — this module is admin-only, never returns scholarship data to non-admin clients |
| `cohort_id` column | Not added. Agreements are pre-cohort; documented as an intentional exception to V2 rule #1 ("Always cohort-scope") in invariants.md |
| Activity events / notifications integration | Optional and additive. If V2 wants the bell-badge to show "Your contract is ready to sign", add `scholarship_agreement` as a value in the existing polymorphic `entity_source_table` enum and emit a notification row from `scholarship_record_archived`. Not in scope for v1 |
| Test data prefix | Already `test_`; same convention in V2 |

### 15.3 Module isolation seams

Hard lines the implementation must respect so the V2 port stays trivial:

1. **No imports from outside `src/lib/scholarship/`, `src/components/scholarship/`, `src/app/full-scholarship/`, `src/app/partial-scholarship/`, `src/app/agreement/`, `src/app/api/agreements/`, `src/app/api/webhooks/dokobit/`, `src/app/dashboard/admin/agreements/`** — with these exceptions:
   - `@/lib/supabase/*` (the three clients)
   - `@/components/ui/*` (ShadCN primitives)
   - `@/lib/validation-schemas` (shared Zod registry; only the
     scholarship-namespaced schemas live there)
   - `@/contexts/app-context` (admin pages need `useApp()` for the role check)
   - `@/types/database` (generated)
   - `@/lib/utils` (the `cn` helper et al.)
2. **No code outside this module imports from inside it.** Other modules
   don't need to know scholarship exists.
3. **All Dokobit knowledge lives in `src/lib/dokobit/`.** Nothing else
   imports `dokobit-*` URLs or response shapes.
4. **All n8n knowledge lives in `src/lib/scholarship/n8n.ts`.** Webhook URL
   construction never leaks elsewhere.
5. **All state transitions go through `state-machine.ts` (client check) and
   the RPCs (server enforce).** No `UPDATE … SET status =` outside of RPCs.
6. **No SQL outside the migration file.** All queries are either Supabase
   SDK selects (admin client) or RPC calls.

A grep audit (`scholarship` imports outside the module) runs in CI and fails
the build if anything imports across the seam in either direction.

### 15.4 The V2 port checklist (committed alongside the module)

A literal markdown checklist at `docs/V2_schema/scholarship_agreements.md`
that lists the steps to run the migration on V2 and which V2 catalogs to
update. See §17.

## 16. Risks left open

- **Dokobit pricing/quota:** unknown until contract is signed; design assumes
  per-document pricing has no surprises that would break the per-student
  cost model.
- **n8n availability:** if n8n goes down, invites/PDFs/final emails block.
  Sentry alert + admin can retry once n8n is back up. We do not double-write
  to a secondary email provider.
- **Wix SMTP throughput:** Wix's SMTP may rate-limit; unknown at scale. For
  v1 volume (handfuls per cohort) this is acceptable.
- **Latvian legal nuances** in the contract template that aren't translated
  to HBS correctly — mitigated by boss/legal sign-off on the generated PDF
  before going to production.
- **Thank-you page copy and the invite/completion email copy** are
  placeholders right now. Boss must supply final wording (Latvian) before we
  ship to production. Tracked as content TODOs in the implementation plan.

## 17. Documentation deliverables

Docs are first-class output of this work, not an afterthought. Everything
below ships in the same PR(s) as the code it describes; CI fails the build
if any of the listed files don't exist.

### 17.1 In-repo docs to write

| Path | Purpose | Audience | Style reference |
|---|---|---|---|
| `docs/superpowers/specs/2026-05-20-scholarship-agreements-design.md` | This file. Frozen on approval | Future engineers | n/a |
| `docs/superpowers/plans/2026-05-20-scholarship-agreements.md` | Implementation plan (subsequent step) | Engineer executing the work | `docs/superpowers/plans/2026-05-18-v5-points-distribution.md` |
| `docs/documentation/scholarship-agreements.md` | Domain doc: what the module does, key concepts, data model, flow diagrams, RPC catalog, env vars, troubleshooting | Engineers maintaining the module | `docs/documentation/peer-review.md`, `docs/documentation/notifications.md` |
| `docs/pages/public/full-scholarship.md` | Per `docs/pages/README.md` format: Purpose → What it does → How it looks → Thought behind it → Wired-up bits | Engineers + designers | `docs/pages/public/invite.md` |
| `docs/pages/public/partial-scholarship.md` | Same as above for partial | " | " |
| `docs/pages/public/agreement-thank-you.md` | Same for the thank-you page | " | " |
| `docs/pages/public/agreement-identity-callback.md` | Same for the Dokobit return target | " | " |
| `docs/pages/admin/agreements.md` | Per pages-doc format for the admin list/detail page | Engineers + admins | `docs/pages/admin/weekly-reports.md` |
| `docs/V2_schema/scholarship_agreements.md` | V2-schema-style table doc (same shape as `team_tasks.md`): columns table, enums, constraints, indexes, rules, RLS, RPC pointers | Schema owner | `docs/V2_schema/team_tasks.md` |
| `docs/V2_schema/scholarship_agreement_events.md` | Same shape for the event log table | " | `docs/V2_schema/activity_events.md` |
| `src/lib/scholarship/README.md` | One-screen module README: what's here, how the pieces fit, what NOT to import from outside, the V2-port checklist link | Engineers landing in the module folder for the first time | n/a — short and pragmatic |
| `src/lib/dokobit/README.md` | Same for the Dokobit client folder: which Dokobit product each file talks to, sandbox/prod env, where the API key comes from, error shape | Engineers | n/a |
| `docs/pages/README.md` index | Add the four new public pages and the admin page | n/a | existing file |
| `docs/V2_schema/README.md` index | Add the two new tables under a new "Scholarship agreements" subsection | n/a | existing file |

### 17.2 Required content beats per doc

**Domain doc (`docs/documentation/scholarship-agreements.md`)** must include:
- One-paragraph elevator pitch
- Mermaid sequence diagram of the 5-step flow (n8n + Dokobit + our backend)
- Mermaid state diagram of the status machine
- Table of every RPC with grant + purpose (mirror of §4.2)
- Env-var checklist (mirror of §13)
- "How to test on sandbox" — step-by-step with a Smart-ID test account
- "How to roll back" — what to do if production goes wrong
- Troubleshooting matrix: symptom → likely cause → fix

**Page docs** follow the exact 5-section format the existing pages docs use:
*Purpose → What it does → How it looks → Thought behind it → Wired-up bits*.
"Wired-up bits" must list every API route called, every Supabase RPC, every
n8n webhook, and every Dokobit endpoint touched. Page docs go stale fast —
each is dated at the bottom with `Last verified against code: YYYY-MM-DD`.

**V2-schema docs** must match the existing V2 docs shape exactly: Columns
table → Enums → Constraints → Indexes → Rules → RLS notes → "Derived
(NOT columns on this table)" if applicable. Cross-link related tables with
`[scholarship_agreement_events](scholarship_agreement_events.md)`.

**Module READMEs** are short (under 60 lines) and pragmatic. The reader is
an engineer dropped into the folder cold; they should leave knowing what to
read next and what not to touch.

### 17.3 Diagrams

Every flow / state diagram is Mermaid embedded in the markdown — no
external image files. This keeps docs portable and reviewable in PRs. The
sequence diagram in the domain doc is the canonical reference; the spec
references it instead of duplicating.

### 17.4 Doc rot prevention

- Page docs carry the `Last verified against code: YYYY-MM-DD` footer; PRs
  that touch a page are expected to update it.
- Domain doc has a "Verified against code" date at the top.
- RPC table in the domain doc is generated from a hand-maintained list (no
  generator yet, but the list is sorted alphabetically so diffs are reviewable).
- The V2-schema docs are part of the V2 spec and follow that doc's own
  staleness conventions.

## 18. Acceptance criteria

The work is "done" only when:

1. All 14 RPCs from §4.2 exist with documented grants and `search_path` (the
   original 12 plus `scholarship_link_dokobit_session` and
   `scholarship_reset_for_retry` added in the bulletproofing pass).
2. CI grep audit (the seam audit from §15.3) passes.
3. End-to-end sandbox test passes with a real Smart-ID test user, covering
   happy path + the 11 edge cases in §9.
4. RLS audit query confirms `anon` and `authenticated` have zero access to
   both tables (read or write).
5. All docs listed in §17.1 exist and are linked from the relevant indexes
   (`docs/pages/README.md`, `docs/V2_schema/README.md`).
6. Boss reviews + signs off on a sample generated PDF for both
   agreement types.
7. The V2-port checklist at `docs/V2_schema/scholarship_agreements.md` is
   walked through on a scratch V2 DB and the resulting schema diffs cleanly
   with the V1 module's migration (zero unexpected changes).

---

**Next:** if approved, this spec is committed and we move to writing the
implementation plan in `docs/superpowers/plans/2026-05-20-scholarship-agreements.md`.
