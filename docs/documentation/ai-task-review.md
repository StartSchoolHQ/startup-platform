# AI Task Reviewer (My Journey)

> Individual (My Journey) task submissions are graded automatically by an OpenAI model instead of
> a human peer. There is no human in the loop and no admin queue — the admin AI Reviews page is a
> read-only audit view. Team tasks are unaffected and continue to use peer review
> (`docs/documentation/peer-review.md`).

## Overview

Key principles:

- One review attempt per submission, tracked as a row in `ai_task_reviews`. Attempts are unlimited —
  a rejection returns the task to `rejected`, the student edits their submission and resubmits, and
  a fresh attempt runs.
- The reviewer judges only what was submitted (description + links + files) against the task's own
  `peer_review_criteria`. See `docs/documentation/ai-review-criteria-guidelines.md` for how to write
  criteria it can actually check.
- Low confidence never approves — it rejects with feedback naming the weak criteria.
- The review is durable: `pg_net` kicks a Vercel worker route asynchronously, and a `pg_cron` sweeper
  re-kicks or fails stale jobs. Nothing depends on the student's browser staying open.
- A settings-only kill switch (`platform_settings.ai_review.mode = 'auto_approve'`, or `enabled =
  false`) makes every future submission approve instantly without touching any code or migration.

---

## Architecture

### End-to-End Flow

```
Student submits individual task → submit_individual_task_v1(progress_id, submission_data)
  → task_progress.status = "pending_review"
  → ai_task_reviews row inserted (status "queued", attempt = N, frozen submission + criteria snapshot)
  → mode "ai" → ai_review_kick_worker_v1() fires pg_net POST to the worker (mode "auto_approve" →
    instantly applies "approved" and skips everything below)
    → POST /api/ai-review/run (x-ai-review-secret header)
      → ai_review_claim_v1() claims the row ("running", stage "fetching_evidence")
        → buildEvidence(): download/extract files, fetch links, cap at 12 items / 30k chars each
          → reviewWithModel(): OpenAI Responses API, strict JSON-schema output
            → decide(): confidence >= threshold + decision=true → approved; else rejected
              → ai_review_apply_decision_v1(review_id, outcome, payload)
                → task_progress.status = "approved" | "rejected", review_feedback set
                → approved only: users balance + transactions row (activity_type "individual")
                → notification patched to the My Journey route
  → ai-review-requeue-stale (cron, every minute): re-queues jobs stuck > 2 min unclaimed or
    > 6 min claimed, up to 3 retries, then finalises as "failed" (task_progress → "rejected" with a
    "please resubmit" message — nothing is left stuck pending_review)
  → student polls get_ai_review_status_v1(progress_id) while queued/running, sees stage + filler
    copy, then the verdict, feedback and per-criterion results on both approve and reject
```

### Key Files

| File | Role |
|------|------|
| `src/lib/ai-review/types.ts` | Shared types (`NormalizedSubmission`, `CriteriaSnapshot`, `AiReviewSettings`, `RejectReason`, …) |
| `src/lib/ai-review/settings.ts` | `parseAiReviewSettings`, `getAiReviewSettings`, `AI_REVIEW_DEFAULTS` |
| `src/lib/ai-review/normalize.ts` | `normalizeSubmission` — TS mirror of `ai_review_normalize_submission_v1` |
| `src/lib/ai-review/evidence/index.ts` | `buildEvidence` — assembles the evidence bundle + manifest |
| `src/lib/ai-review/evidence/files.ts` | File download + text/image/PDF extraction |
| `src/lib/ai-review/evidence/links.ts` | Link classification + fetch-as-text (incl. Google Docs/Sheets/Slides export) |
| `src/lib/ai-review/evidence/safe-fetch.ts` | SSRF-safe fetch (DNS-rebinding-safe, manual redirects) |
| `src/lib/ai-review/prompt.ts` | System prompt + user content builder (`PROMPT_VERSION`) |
| `src/lib/ai-review/schema.ts` | `ReviewResultSchema` (Zod) + the strict JSON schema sent to OpenAI |
| `src/lib/ai-review/openai-client.ts` | Lazily-constructed OpenAI client (90 s timeout, 1 retry) |
| `src/lib/ai-review/review.ts` | `reviewWithModel` — calls the model, retries once on unparseable output, estimates cost |
| `src/lib/ai-review/decide.ts` | `decide` — turns a `ReviewResult` + threshold into an outcome + feedback |
| `src/lib/ai-review/run-review.ts` | `runReviewOnSnapshot` (pure) + `runReview` (claims, runs, applies decision) |
| `src/lib/ai-review/apply.ts` | `applyDecision` — thin wrapper around `ai_review_apply_decision_v1` |
| `src/app/api/ai-review/run/route.ts` | Worker route the DB calls back into |
| `src/lib/data/ai-reviews.ts` | `submitIndividualTaskV1`, `getAiReviewStatus` (student-facing RPC wrappers) |
| `src/hooks/use-ai-review-status.ts` | Polling hook (3 s / 15 s after 5 min, stops when final) |
| `src/components/my-journey/ai-review-progress.tsx` | "Reviewing your submission" stage UI + filler copy |
| `src/components/my-journey/ai-review-result.tsx` | Verdict card: pass/fail, feedback, per-criterion list, resubmit |
| `src/app/dashboard/admin/ai-reviews/page.tsx` | Admin audit page |
| `src/app/api/admin/ai-reviews/route.ts` | Admin list API (paginated, filtered, searched) |
| `src/hooks/use-ai-review-settings.ts` | Admin settings read/write (via the existing `set_platform_setting_v1`) |
| `src/components/admin/ai-review-settings-card.tsx` | Admin settings card (enabled, mode, threshold, model) |
| `scripts/ai-review-calibrate.ts` | Calibration dry-run against historical team submissions |

---

## Database

### `ai_task_reviews`

One row per review attempt — audit log, job queue and attempt counter in one table. RLS is
**deny-all**: students read via `get_ai_review_status_v1`, admins read via the API route using the
service-role client.

| Column | Type | Description |
|--------|------|--------------|
| `id` | UUID | Primary key |
| `progress_id` | UUID | FK `task_progress`, `on delete cascade` |
| `task_id` | UUID | FK `tasks`, `on delete cascade` |
| `user_id` | UUID | FK `users`, `on delete cascade` |
| `attempt` | INT | 1, 2, 3 … per `progress_id` (unique on `(progress_id, attempt)`) |
| `status` | TEXT | `queued` \| `running` \| `approved` \| `rejected` \| `failed` |
| `stage` | TEXT | `fetching_evidence` \| `reading_files` \| `checking_links` \| `reviewing` \| `finalizing` |
| `submission_snapshot` | JSONB | Normalised `{description, links:[{url,title}], files:[{url,name,size,type}]}`, frozen at submit time |
| `criteria_snapshot` | JSONB | `{criteria, review_instructions, deliverables, title, description}` frozen at submit time |
| `evidence_manifest` | JSONB | Per evidence item: `{id, source, url, label, status, chars, bytes, note}` |
| `model` | TEXT | Model that actually answered (from the API response) |
| `prompt_version` | TEXT | `PROMPT_VERSION` from `prompt.ts` at review time |
| `decision` | BOOLEAN | Raw model decision before the confidence gate |
| `confidence` | NUMERIC(4,3) | 0–1 |
| `criteria_results` | JSONB | Array of `{id, label, passed, evidence}` |
| `feedback` | TEXT | Student-facing feedback, always present on approve and reject |
| `reject_reason` | TEXT | `criteria` \| `low_confidence` \| `unverifiable_evidence` \| `technical_failure` |
| `raw_response` | JSONB | Full OpenAI response object (admin debugging only) |
| `input_tokens` / `output_tokens` | INT | Token usage |
| `cost_usd` | NUMERIC(8,5) | Estimated cost of this attempt |
| `error` | TEXT | Set on `failed` |
| `decided_by` | TEXT | `ai` \| `system` \| `auto_approve_fallback` |
| `retry_count` | INT | Incremented by the sweeper, max 3 before finalising as `failed` |
| `claimed_at` / `started_at` / `finished_at` | TIMESTAMPTZ | Lifecycle timestamps |
| `created_at` / `updated_at` | TIMESTAMPTZ | Standard, `updated_at` via the shared trigger |

Indexes: unique `(progress_id, attempt)`; partial `(status, created_at)` on `status in
('queued','running')` for the sweeper; `(user_id, created_at desc)` for student history.

### Settings row — `platform_settings.key = 'ai_review'`

```json
{
  "enabled": true,
  "mode": "ai",
  "model": "gpt-5.4",
  "confidence_threshold": 0.75,
  "worker_url": "https://.../api/ai-review/run",
  "max_file_mb": 25,
  "max_pdf_pages": 40,
  "attempt_flag_threshold": 5
}
```

`enabled: false` or `mode: "auto_approve"` both short-circuit `submit_individual_task_v1` into instant
approval (`decided_by = 'auto_approve_fallback'`) — the AI is never called. `attempt_flag_threshold`
is read by the admin table to flag rows whose `attempt` count exceeds it (a student stuck
resubmitting past this many times). `max_pdf_pages` is parsed into `AiReviewSettings.maxPdfPages` and
stored/editable like the rest, but nothing currently enforces a PDF page-count cap in
`evidence/files.ts` (only `max_file_mb`, a byte cap, is enforced) — worth wiring up or removing if it
stays unused. Read via `parseAiReviewSettings`
(`src/lib/ai-review/settings.ts`), which defaults every field so a partially-written row never
breaks the reader. Written via the existing `set_platform_setting_v1(p_key, p_value)` RPC (from the
two-economies feature — not new here); no dedicated AI-review settings RPC was added.

### Vault secret

`ai_review_worker_secret` — shared secret the DB sends as `x-ai-review-secret` when calling the
worker, and the worker route compares with `timingSafeEqual` against `AI_REVIEW_WORKER_SECRET`.

### RPC Functions

All seven are new, `_v1`, SECURITY DEFINER, `search_path = public, pg_temp`, and droppable
(no existing function or trigger was modified).

| Function | Callable by | Purpose |
|---|---|---|
| `submit_individual_task_v1(p_progress_id uuid, p_submission_data jsonb) returns jsonb` | `authenticated` (owner only) | Validates the caller owns the `individual`-context row and it's `in_progress`/`rejected`; archives the prior submission into `submission_history`; sets `pending_review`; computes the next `attempt`; inserts the `ai_task_reviews` row with normalized snapshots; either applies `auto_approve_fallback` or kicks the worker. Returns `{success, review_id, attempt, mode}`. |
| `get_ai_review_status_v1(p_progress_id uuid) returns jsonb` | `authenticated` (owner only) | Returns the latest attempt's sanitised status for the caller's own individual progress row — no raw model output, no cost/token fields. |
| `ai_review_claim_v1(p_review_id uuid) returns setof ai_task_reviews` | `service_role` | Atomically flips a `queued` row to `running` (`claimed_at`, `started_at`, `stage = 'fetching_evidence'`); returns nothing if it wasn't claimable. |
| `ai_review_apply_decision_v1(p_review_id uuid, p_outcome text, p_payload jsonb) returns jsonb` | `service_role` (also called internally by `submit_individual_task_v1` and the sweeper) | Finalises a review: writes the outcome + all result fields, updates `task_progress` (approved/rejected), on approve credits `users` balances + inserts a `transactions` row (`activity_type = 'individual'`, `metadata.completion_type = 'ai_review_approved'`), appends a `peer_review_history`/`add_peer_review_history_entry` entry, and patches the existing review-completion notification's route to My Journey. Requires `feedback` on approve; raises if the row isn't still `queued`/`running` or the linked `task_progress` isn't `pending_review`. |
| `ai_review_requeue_stale_v1() returns int` | `service_role` / cron | Sweeper: re-queues rows `queued` > 2 min unclaimed or `running` > 6 min claimed (up to 3 retries via `retry_count`), else finalises as `failed` — wrapped in its own exception handler so one row's failure to finalise (e.g. `task_progress` no longer `pending_review`) doesn't abort the whole sweep. |
| `ai_review_normalize_submission_v1(p_raw jsonb) returns jsonb` | internal only (no grants) | SQL-side mirror of `normalizeSubmission` — handles double-encoded JSON strings, `external_urls[]`/`files[]`/`screenshots[]` as either bare URL strings or `{url,...}` objects, and URL-in-title fallback. |
| `ai_review_kick_worker_v1(p_review_id uuid) returns void` | internal only (no grants) | Fires an async `pg_net.http_post` to `worker_url` with the vault secret header; swallows all errors (the sweeper is the retry mechanism) and no-ops if `worker_url` is unset or still the placeholder. |

### Cron

`ai-review-requeue-stale` — `select public.ai_review_requeue_stale_v1();` every minute
(`* * * * *`).

### Migrations

`20260909120000_ai_review_schema_v1.sql` (table + settings row), `20260909120100_ai_review_rpcs_v1.sql`
(all seven functions + grants), `20260909120150_ai_review_rpcs_v1_grant_fix.sql` (closed an
anon-grant gap on the two student-facing RPCs + added SECURITY DEFINER/search_path to the normalise
helper), `20260909120200_ai_review_cron_v1.sql` (the cron job), `20260909120250_ai_review_requeue_guard_v1.sql`
(wrapped the sweeper's terminal `ai_review_apply_decision_v1('failed', …)` call so one row raising
doesn't abort the whole sweep).

---

## Worker

### Route — `POST /api/ai-review/run`

`src/app/api/ai-review/run/route.ts`. `runtime = "nodejs"`, `maxDuration = 300`. Auth: header
`x-ai-review-secret` compared with `timingSafeEqual` against `AI_REVIEW_WORKER_SECRET` — no user
session involved, this is a machine-to-machine call from `pg_net`. Body: `{ review_id: uuid }`
(Zod-validated). Calls `runReview(admin, review_id)`; on success returns
`{outcome, reject_reason, cost_usd}` (or `{skipped: "not_claimable"}` if the row was already
claimed/final); on any thrown error, logs and returns 500 **without** finalising the row — it stays
`running` and the cron sweeper retries it (3× before `failed`).

### Modules

| Module | Responsibility |
|---|---|
| `run-review.ts` | `runReviewOnSnapshot` (pure: normalize → evidence → model → decide, no DB writes) used by both the worker and the calibration script; `runReview` wraps it with claim/apply-decision for production use. Throws `task_has_no_criteria` when a task's `peer_review_criteria` has zero points in every block — the caller (worker path) turns that into an immediate `failed` with a "no review criteria yet" student message; the calibration script catches it per-row instead. |
| `evidence/index.ts` | `buildEvidence` — builds the ordered evidence list + manifest, enforcing the item budget below |
| `evidence/files.ts` | Classifies + extracts file content (image passthrough, PDF passthrough, DOCX via `mammoth`, XLSX via `exceljs` (first 60 rows/sheet), PPTX via raw slide-XML text extraction, CSV/text/HTML/JSON as UTF-8 text, video/HEIC/anything else → `unsupported`) |
| `evidence/links.ts` | Classifies a link (`storage_file`, `google_doc/sheet/slides`, `search_results`, `generic`), rewrites Google Docs/Sheets/Slides links to their `export` endpoints, fetches and converts HTML to text (`node-html-parser`), rejects a page whose extracted text is under 200 chars |
| `evidence/safe-fetch.ts` | SSRF guard: only `http`/`https`, blocks `localhost`/loopback/RFC1918/link-local/metadata ranges for both the literal host and every DNS-resolved address (rebinding-safe), manual redirect following capped at 3 hops (re-validated each hop), streamed body read capped by byte count |
| `prompt.ts` | Builds the system prompt (rules 1–8: evidence-only judging, quantities, dates/visibility, untrusted-content warning, feedback style) and the user content (task + criteria labelled `E1..`/`R1..` + evidence manifest + the evidence items themselves as text/image/PDF blocks) |
| `schema.ts` | `ReviewResultSchema` (Zod) mirrors the strict OpenAI JSON schema the model is constrained to |
| `review.ts` | Calls `openai.responses.create` with `reasoning.effort: "medium"` and the strict schema; retries once on unparseable `output_text` if there's still time in the 150 s retry budget; estimates cost from a hardcoded `PRICING` table (`gpt-5.4`: $2.50/$15.00 per 1M input/output tokens; `gpt-5.4-mini`: $0.75/$4.50) |
| `decide.ts` | `decision && confidence >= threshold` → approved. `decision` true but confidence too low → rejected, `low_confidence`, feedback names the failed criteria. `decision` false → rejected, `unverifiable_evidence` if that's why, else `criteria`. |

### Evidence handling by type

| Input | Handling | Evidence kind sent to the model |
|---|---|---|
| Student description | Always included, truncated to 30k chars, labelled "a claim, not proof" | `text` |
| Image (png/jpg/jpeg/webp/gif) | Passed as an image URL, `detail: "high"` | `image` |
| HEIC image | Not decodable | `unsupported` |
| PDF | Downloaded, base64-encoded, sent as `input_file` | `pdf` |
| DOCX | `mammoth.extractRawText` | `text` |
| XLSX | `exceljs`, sheet name + up to 60 rows per sheet | `text` |
| PPTX | Slide XML text nodes extracted via `jszip`, one block per slide | `text` |
| CSV / TXT / MD / HTML / JSON | Read as UTF-8, HTML stripped to text | `text` |
| Video (mp4/mov/webm/avi/mkv) | Not reviewable | `unsupported`, feedback asks for screenshots |
| Storage-bucket link (matches our own Supabase project's `/storage/v1/object/public/task-files/` host) | Treated as a file, downloaded like an upload | as above by file type |
| Google Docs/Sheets/Slides link | Rewritten to the `export` endpoint (`format=txt`/`csv`/`txt`) and fetched as text | `text`, or `unreachable` if the export isn't public |
| Search-results URL (Google/Bing/DuckDuckGo `/search`) | Never fetched | `unverifiable` — feedback asks for a dated screenshot instead |
| Any other public URL | Fetched (`safeFetch`, manual redirects ≤3), HTML converted to text, rejected if resulting text < 200 chars | `text`, or `unreachable` |
| Private/login-walled/JS-only page | Fetch fails or returns too little text | `unreachable` |
| Anything past the 12-item budget | Not fetched at all | `too_large`, noted in the manifest only |

### Budget & timeouts

- **12 evidence items max** (files + links combined; the description doesn't count against this cap).
- **30,000 characters max** per text-like evidence item (truncated, not summarised).
- **10 s per-item fetch/download timeout** (`TIMEOUT_MS` in `evidence/index.ts`).
- **`max_file_mb` setting** (default 25 MB) enforced both on declared `content-length` and on the
  actual streamed byte count (`readBodyWithCap`), so a dishonest or missing header can't bypass it.
- **90 s** OpenAI client timeout per call, 1 SDK-level retry; the app layer allows one additional
  retry on unparseable output as long as **150 s** haven't elapsed since the first attempt started.
- **300 s** (`maxDuration`) ceiling on the worker route itself (Vercel Pro fluid compute).
- **SSRF guard**: only `http`/`https` schemes; blocks loopback, RFC1918 private ranges, link-local
  (incl. `169.254.169.254` cloud metadata), and their IPv6 equivalents — checked against the literal
  host and every DNS-resolved address, and re-checked on every redirect hop (max 3, manual
  redirect following so each hop is re-validated — `redirect: "manual"` in `safeFetch`).

---

## Decision Policy

| Model output | Outcome | `reject_reason` | Notes |
|---|---|---|---|
| `decision = true`, `confidence >= threshold` | `approved` | — | Only outcome that pays XP/Points |
| `decision = true`, `confidence < threshold` | `rejected` | `low_confidence` | Feedback names the criteria the model marked unpassed (or "the criteria the reviewer was least sure about" if none) |
| `decision = false`, `unverifiable_evidence = true` | `rejected` | `unverifiable_evidence` | At least one failed criterion failed only because its evidence was missing/unreachable/too large |
| `decision = false`, `unverifiable_evidence = false` | `rejected` | `criteria` | A stated "Reject if" rule was triggered, or a checkable criterion was actually judged not met |
| Task has zero criteria points in both blocks | `failed` | `technical_failure` | Fails fast, before calling the model at all — student sees "no review criteria yet, please tell your mentor" |
| Model output unparseable twice, or any other thrown error in the worker | left `running` → sweeper retries 3× → `failed` | `technical_failure` | Student sees "we could not complete the automatic review this time, please resubmit" |
| `mode = "auto_approve"` or `enabled = false` | `approved` | — | `decided_by = "auto_approve_fallback"`, model is never called |

Default `confidence_threshold` is **0.75** (admin-editable).

---

## Student UI

- The individual task detail page (`src/app/dashboard/my-journey/task/[id]/page.tsx`) calls
  `submitIndividualTaskV1` (re-exported from `src/lib/database.ts`, defined in
  `src/lib/data/ai-reviews.ts`) → `submit_individual_task_v1` on submit.
- While `status` is `queued`/`running`, `AiReviewProgress` (`src/components/my-journey/ai-review-progress.tsx`)
  shows a stage-mapped message (`fetching_evidence` → `reviewing` → `finalizing`), a progress bar,
  and rotating "still working" filler copy that never claims a result. Past 5 minutes it switches to
  "still working — you can leave, we'll notify you." Explicitly tells the student they can close the
  page — the review keeps running server-side.
- `useAiReviewStatus` (`src/hooks/use-ai-review-status.ts`) polls `get_ai_review_status_v1` every 3 s
  for the first 5 minutes, then every 15 s, and stops entirely once `status` is no longer
  `queued`/`running`.
- On a final status, `AiReviewResult` (`src/components/my-journey/ai-review-result.tsx`) shows a
  pass/fail card with the attempt number, XP/points earned (approved only), the full feedback text,
  and the per-criterion pass/fail list with each criterion's cited evidence. Rejected submissions get
  a "Fix and resubmit" button that reopens the same submission flow.

---

## Admin Page

**File:** `src/app/dashboard/admin/ai-reviews/page.tsx` — access gated on `user.primary_role ===
"admin"` (client-side redirect, same pattern as other admin pages). Explicitly **read-only audit**,
not a decision queue — there is nothing to approve or reject here.

**API:** `GET /api/admin/ai-reviews` (`src/app/api/admin/ai-reviews/route.ts`) — re-checks
`primary_role === "admin"` server-side (never trusts the client), uses the admin (service-role)
client to read `ai_task_reviews` joined to `tasks`/`users`. Query params: `page`, `limit` (max 100),
`status` (`all`/`queued`/`running`/`approved`/`rejected`/`failed`), `reject_reason`, `search` (matches
task title or student name — resolved to id lists **before** the paginated query so the count and
pages reflect the search). Returns `{data, total, page, limit, summary}` where `summary` is computed
over every non-`queued`/`running` row: `today`, `approval_rate`, `reject_reasons` (counts by reason),
`failures`, `cost_usd`.

**Components:** `AiReviewsTable` (fetches + paginates + owns filter state) →
`AiReviewsSummary` (4 stat cards: reviewed today, approval rate, failures — red if > 0, total spend)
→ `AiReviewsFilters` (search box + status select + reject-reason select) → `AiReviewsRow` per row
(student avatar/name, task title, attempt badge — red-flagged when `attempts_for_progress >
attemptFlagThreshold`, status badge, reject reason, confidence %, cost, relative time) → clicking a
row opens `AiReviewDetailDialog`, itself split into `ai-review-detail-verdict.tsx` (decision,
confidence, feedback), `ai-review-detail-criteria.tsx` (per-criterion results), `ai-review-detail-evidence.tsx`
(the evidence manifest) and `ai-review-detail-submission.tsx` (the raw submission snapshot).

---

## Settings

**Card:** `AiReviewSettingsCard` (`src/components/admin/ai-review-settings-card.tsx`) on the admin
settings surface — a switch (`enabled`, the kill switch), a mode select (`ai` / `auto_approve` —
labelled in the UI as "rollback switch: every submission passes instantly"), a confidence-threshold
number input (0–1, clamped and only saved on blur if changed), and a model text input (saved on blur).

**Hook:** `useAiReviewSettings` / `useSetAiReviewSettings` (`src/hooks/use-ai-review-settings.ts`) —
reads/writes through the pre-existing `set_platform_setting_v1(p_key, p_value)` RPC (from the
two-economies feature, admin-only per its own grants); no new settings RPC was added for AI review.
Reads are gated on client mount (`enabled: mounted`) to avoid SSR hydration mismatch, 5-minute
`staleTime`; writes have `retry: 0`, `onError` toasts with "only admins can change this", `onSuccess`
toasts and updates the cache directly plus invalidates.

---

## Calibration Script

**File:** `scripts/ai-review-calibrate.ts`. **Run:** `npm run ai-review:calibrate -- --rejected 29
--approved 31 [--threshold 0.75] [--model gpt-5.4]` (requires `OPENAI_API_KEY` and
`SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` in `.env.local` — the user runs this, not an
agent). Loads the newest N `rejected` and N `approved`-and-never-rejected **team** task_progress rows
(team tasks already have a human decision to compare against; the individual path has no production
history yet), builds a `CriteriaSnapshot` from each row's task, normalizes its `submission_data`, and
calls `runReviewOnSnapshot` directly — no database writes, no `ai_task_reviews` rows created. Per row
it records whether the AI agreed with the human, whether it was a false approval (human rejected, AI
approved — the case calibration exists to drive to zero) or false rejection, confidence, reject
reason, cost and latency; rows that throw (e.g. `task_has_no_criteria`) are caught individually and
recorded as `ai: "error"` rather than aborting the run. Prints a `console.table` summary (agreement
rate, false approvals/rejections, mean confidence split by human decision, total/per-review cost) and
writes both a full JSON dump and a flat CSV to `reports/ai-review-calibration-<YYYYMMDD-HHmm>.{json,csv}`
(`reports/` is untracked — these are never committed). Intended iteration loop: adjust `--threshold`
and/or edit `prompt.ts` (bumping `PROMPT_VERSION`) until false approvals are 0 on the negative set and
false rejections are acceptable. Each run costs roughly $1–4 in OpenAI spend.

---

## Cost

Estimated per-review from a hardcoded per-model `PRICING` table in `review.ts` (USD per 1M tokens,
verified 2026-09-09): `gpt-5.4` $2.50 input / $15.00 output; `gpt-5.4-mini` $0.75 input / $4.50
output. Update `PRICING` if OpenAI changes list prices — this is an estimate stored per row
(`ai_task_reviews.cost_usd`) and surfaced in the admin summary (`cost_usd`) and detail dialog, not a
billing-accurate figure from OpenAI's own usage API.

---

## Rollback

**Soft (no code, no migration):** Admin → AI Reviewer settings card → mode `auto_approve`, or `enabled`
off. Every future submission approves instantly through the same RPC path; nothing already reviewed
changes.

**Hard:** see the dated entry in the root `CLAUDE.md` "Rollback Reference" section for the exact
`drop function`/`drop table` statements, the cron unschedule, and how to reverse paid rewards
(`transactions.metadata->>'completion_type' = 'ai_review_approved'`).

---

## File Reference

### Pages
| File | Purpose |
|------|---------|
| `src/app/dashboard/admin/ai-reviews/page.tsx` | Admin audit page |

### API Routes
| File | Purpose |
|------|---------|
| `src/app/api/ai-review/run/route.ts` | Worker route (secret-header auth, calls `runReview`) |
| `src/app/api/admin/ai-reviews/route.ts` | Admin list API (paginated, filtered, searched) |

### Components
| File | Purpose |
|------|---------|
| `src/components/my-journey/ai-review-progress.tsx` | In-flight review stage UI |
| `src/components/my-journey/ai-review-result.tsx` | Verdict card + resubmit |
| `src/components/my-journey/task-action-card.tsx` | Renders `AiReviewProgress`/`AiReviewResult` for an individual task's current state |
| `src/components/admin/ai-review-settings-card.tsx` | Admin settings (enabled/mode/threshold/model) |
| `src/components/admin/ai-reviews-table.tsx` | Admin table (fetch, paginate, filter state) |
| `src/components/admin/ai-reviews-summary.tsx` | Admin 4-stat summary cards |
| `src/components/admin/ai-reviews-filters.tsx` | Admin search + status + reject-reason filters |
| `src/components/admin/ai-reviews-row.tsx` | Admin table row |
| `src/components/admin/ai-review-detail-dialog.tsx` | Admin detail dialog shell |
| `src/components/admin/ai-review-detail-verdict.tsx` | Detail: decision/confidence/feedback |
| `src/components/admin/ai-review-detail-criteria.tsx` | Detail: per-criterion results |
| `src/components/admin/ai-review-detail-evidence.tsx` | Detail: evidence manifest |
| `src/components/admin/ai-review-detail-submission.tsx` | Detail: raw submission snapshot |

### Data & Logic
| File | Purpose |
|------|---------|
| `src/lib/ai-review/*` | Types, settings, normalize, evidence, prompt, schema, review, decide, run-review, apply (see Worker section) |
| `src/lib/data/ai-reviews.ts` | Student-facing RPC wrappers (`submitIndividualTaskV1`, `getAiReviewStatus`) |
| `src/hooks/use-ai-review-status.ts` | Student polling hook |
| `src/hooks/use-ai-review-settings.ts` | Admin settings read/write hook |
| `scripts/ai-review-calibrate.ts` | Calibration dry-run script |

### Types
| File | Purpose |
|------|---------|
| `src/lib/ai-review/types.ts` | Core AI-review domain types |
| `src/types/ai-review-admin.ts` | Admin API/UI row + summary types |
| `src/types/database.ts` | Auto-generated DB types (`ai_task_reviews`, `platform_settings`) |

### Migrations
| File | Purpose |
|------|---------|
| `supabase/migrations/20260909120000_ai_review_schema_v1.sql` | Table + settings row |
| `supabase/migrations/20260909120100_ai_review_rpcs_v1.sql` | All seven functions + grants |
| `supabase/migrations/20260909120150_ai_review_rpcs_v1_grant_fix.sql` | Grant-hygiene fix |
| `supabase/migrations/20260909120200_ai_review_cron_v1.sql` | Cron job |
| `supabase/migrations/20260909120250_ai_review_requeue_guard_v1.sql` | Sweeper exception-safety fix |

### Docs
| File | Purpose |
|------|---------|
| `docs/documentation/ai-review-criteria-guidelines.md` | How to write AI-checkable criteria |
| `docs/superpowers/specs/2026-09-09-ai-task-reviewer-design.md` | Original design spec |
| `docs/superpowers/plans/2026-09-09-ai-task-reviewer.md` | Implementation plan |
