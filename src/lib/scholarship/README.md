# Scholarship Agreements Module

Self-contained module that issues legally binding scholarship contracts via
two hidden public links (`/full-scholarship-agreement`,
`/partial-scholarship-agreement`). Students fill a short form (email × 2,
phone, address), identify via Dokobit eID, and sign the pre-filled contract.
The school admin batch-countersigns from `/dashboard/admin/agreements`.
The final `.edoc` is emailed via n8n.

## Files

| File | Responsibility |
|---|---|
| `data.ts` | DB facade — every write goes through a SECURITY DEFINER RPC |
| `state-machine.ts` | Allowed-transition map (mirror of DB enforcement) |
| `auth.ts` | `requireAdmin()` server helper |
| `n8n.ts` | Two webhooks: render-pdf (sync), completed-email (fire-and-forget) |
| `pdf.ts` | Handlebars render → HTML → n8n PDF |
| `complete-identity.ts` | eID → PDF → Dokobit signing pipeline |
| `templates/full-scholarship-en.hbs` | Full-scholarship contract |
| `templates/partial-scholarship-en.hbs` | Partial-scholarship contract |

## Hard rules

1. **Never UPDATE the tables directly.** All writes go through the RPCs
   exposed by `data.ts`. RLS denies all direct anon/authenticated writes;
   the service role bypasses RLS only inside `data.ts`.
2. **Never call `fetch()` against Dokobit URLs from outside `@/lib/dokobit/*`.**
   Adding a new endpoint? Extend `src/lib/dokobit/identity.ts` or
   `signing.ts` and add a Zod schema in `types.ts`.
3. **Never construct n8n URLs from outside `n8n.ts`.** Same rule, same
   reason.
4. **No code outside this module imports anything from inside it.** The
   `scripts/seam-audit.mjs` CI check enforces this. The only consumers
   are the Next.js routes and pages under:
   - `src/app/api/agreements/**`
   - `src/app/full-scholarship-agreement/**`
   - `src/app/partial-scholarship-agreement/**`
   - `src/app/agreement/**`
   - `src/app/dashboard/admin/agreements/**`
   - `src/app/api/webhooks/dokobit/**`

## Status flow

```
draft → identity_verified → awaiting_student_signature → student_signed
  → awaiting_school_signature → school_signed → archived
```

Terminal off-paths: `cancelled`, `expired`, `failed`.

A row is created in `draft` only after the form is submitted AND a Dokobit
auth session has been created — the Dokobit `session_token` is the row's
correlation key through the callback. Drafts older than 1 day are reaped
by the daily cron.

## Anti-cheat

A partial unique index on `(signer_personal_code, agreement_type) WHERE
signer_personal_code IS NOT NULL AND status NOT IN ('cancelled','expired','failed')`
prevents the same person from receiving a Full AND Partial contract — once
identity is locked on one, the other RPC fails on the unique constraint.

## Porting to V2

See `docs/V2_schema/scholarship_agreements.md` for the V2-port checklist.
The migration replays cleanly; expected effort is half a day.

## Spec + plan

- `docs/superpowers/plans/2026-05-20-scholarship-agreements.md`
- `docs/superpowers/specs/full-scholarship-template.txt` (source legal text)
