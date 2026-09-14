# Google SSO + Signup Gate — Design

**Date:** 2026-08-27, revised 2026-09-14
**Status:** approved 2026-09-14 (strict Workspace-only), implementation started
**Deadline driver:** new cohort onboarding (0 students onboarded as of 2026-09-14)

## Problem (verified 2026-08-27, re-verified 2026-09-14)

The current invitation flow (`inviteUserByEmail` → `{{ .ConfirmationURL }}` email →
implicit-flow `#access_token` hash → `/auth/callback`) only works because
`NEXT_PUBLIC_APP_URL` is effectively unset on Vercel, so Supabase falls back to the
Site URL and `src/app/page.tsx` handles the hash client-side. `/auth/callback` is a
server route and can never read the hash; it redirects to `/auth/auth-code-error`,
which does not exist (404).

Audit log (`auth.audit_log_entries`): 84 invites ever sent → 68 clean, 9 needed the
"Forgot password" fallback (single-use token consumed by mail scanners / re-clicks),
7 never accepted. The fallback skips `/profile/setup` entirely.

Other verified defects: dead welcome-notification insert (RLS `WITH CHECK (false)`),
`listUsers()` per-invite with 50-row default page vs 76 users, unvalidated
`body.metadata` in resend, middleware `publicRoutes` contains `"/"` with `startsWith`
so every path is public, public `auth.signUp` open at the API level.

**Found 2026-09-14:** profile completeness is enforced only inside `/auth/callback`.
A user who abandons `/profile/setup` and later signs in from `/login` lands on
`/dashboard` with no name or avatar — `dashboard/layout.tsx` checks only for a session.

## Decision

Replace passwords + email tokens with **Google OAuth (PKCE via `@supabase/ssr`)**
gated by a **`before_user_created` Postgres auth hook**. Invitations are removed
entirely: an `@startschool.org` Google account *is* the invitation.

### Decisions log

- 2026-08-27 (Elias): no approval gate; auto-assign the single open batch.
- 2026-09-14 (Elias): **strict Workspace-only** — no admin "create account" path or UI;
  non-Workspace people get a Workspace alias from IT. **Google button + hidden legacy
  password form** (Phase 2 deletes the form). **Profile setup = Google name pre-filled
  and editable + mandatory avatar upload.**

### Rules

| # | Rule | Enforced by |
|---|---|---|
| R1 | A brand-new account may only be created by Google sign-in with an `@startschool.org` email | `public.hook_restrict_signup(event jsonb)` — rejects `provider <> 'google'` or `split_part(lower(email),'@',2) <> 'startschool.org'` with HTTP 403 |
| R2 | **No exceptions path.** Nobody outside the Workspace domain can get a new account. (Superseded 2026-09-14 — the August admin pre-create route is not built.) | absence of any `auth.admin.createUser` caller in the app |
| R3 | Existing accounts (76 identities, all `email`, incl. 2 active gmail students): nothing to migrate. Same email + confirmed → Google identity auto-links on first Google sign-in; the hook does not fire because no user is created | Supabase automatic identity linking (existing account must have confirmed email) |
| R4 | Login page shows only "Continue with Google"; a "Use password instead" toggle reveals the unchanged legacy `LoginForm`. Password form deleted in Phase 2 | `src/app/login/page.tsx` + `Collapsible` |
| R5 | Profile is complete only when `name` **and** `avatar_url` are set. Setup page collects name (pre-filled from Google, editable) + avatar; no password | `isProfileComplete`, `/profile/setup`, `/api/profile/setup` (unchanged) |
| R6 | `public.users.name` for Google-created users comes from `raw_user_meta_data.full_name` (fallback `name`); legacy `first_name + last_name` still wins when present | `handle_new_auth_user` v2 (backup `_backup_v1` kept) |
| R7 | OAuth errors (hook rejection, cancelled consent) land on a real page with a human message | `/auth/callback` reads `?error`/`?error_description`; new `/auth/auth-code-error` page |
| R8 | Middleware public-route match is exact for `/` and prefix for the rest | `classifyRoute()` in `src/lib/supabase/route-classification.ts` |
| R9 | New accounts are auto-assigned to the **single open batch** (`diploma_batches.closed_at IS NULL`); 0 or >1 open → `batch_id` NULL | `handle_new_auth_user` v2 |
| R10 | **No approval gate** — a @startschool.org Google user reaches the dashboard immediately after avatar upload | decision by Elias 2026-08-27 |
| R11 | **Setup gate on every dashboard request**: `dashboard/layout.tsx` loads the caller's `users` row and redirects incomplete profiles to `/profile/setup`; `/profile/setup` redirects complete profiles to `/dashboard` | `src/app/dashboard/layout.tsx`, `src/app/profile/setup/page.tsx` |

Side effect of R11: one currently active gmail student has no avatar and will be
asked for one on her next login. Accepted.

### Operational prerequisite

Mercury-Redstone was closed on 2026-08-27 14:12 UTC → **0 open batches** (still true
2026-09-14). The new cohort batch must be created (Diplomas → Setup) before the first
student signs in, or they get `batch_id = NULL` and are invisible to batch health/close.

### Not doing

- No `hd=startschool.org` on the Google button. Keeps the account picker honest for
  people with several Google accounts; the domain is enforced server-side by the hook only.
- No allow-list table, no admin create-account route or tab.
- No global "Disable signups" toggle — it would also block Google new-user creation.
  The hook is the gate.
- Google `picture` is **not** used as `avatar_url` (external host not in `next.config`
  `images.remotePatterns`; avatar upload stays required).

### Phasing

**Phase 1:** hook + trigger v2, middleware fix, `isProfileComplete` change, dashboard
layout setup gate, `/auth/auth-code-error` page + callback error handling, Google
button with hidden legacy form, setup page without password, **remove the Invitations
tab** from the admin users page, data fixes (confirm the one pending invitee, delete 5
unconfirmed leftovers — each needs an explicit OK at execution time), docs. Legacy
invite routes/components stay on disk untouched.

**Phase 2 (≥1 week after the cohort is onboarded, separate approval):** delete
`/invite`, `/auth/invite`, hash handling in `page.tsx`, `/api/admin/bulk-invite`,
`/api/admin/resend-invite`, `/api/admin/pending-invites`, `bulk-invite-tab`,
`manual-invite-form`, `csv-invite-uploader`, `pending-invitations-table`, password
login + reset from the login page, password change from the account page,
`docs/pages/public/invite.md`, `auth-invite.md`.

### Manual steps (owner: Elias)

1. **Supabase → Database → Backups → Create backup** before the migration is applied.
2. **Google Cloud Console** → APIs & Services → Credentials → *Create OAuth client ID* → type **Web application**.
   - Authorized JavaScript origins: `https://startup.startschool.org`, `https://startup-platform-nine.vercel.app`, `http://localhost:3000`
   - Authorized redirect URI: `https://ksoohvygoysofvtqdumz.supabase.co/auth/v1/callback`
   - Audience (consent screen): **External** — Internal would block the 2 existing gmail students from linking. Scopes `email`, `profile`, `openid` only (non-sensitive → no Google verification). Publish to production.
3. **Supabase → Authentication → Providers → Google**: enable, paste Client ID + Secret.
4. **Supabase → Authentication → Hooks → Before User Created**: enable, type *Postgres*, schema `public`, function `hook_restrict_signup`. **Only after the migration is applied and its tests pass.**
5. **Diplomas → Setup → create the new cohort batch** before any student signs in.
6. Redirect URL allow-list already contains `/auth/callback` for all three origins — no change.
7. For E2E: one throwaway `@startschool.org` Google account that has never logged in.

### Rollback

| Layer | Action | Time |
|---|---|---|
| Hook | Dashboard → Hooks → disable | instant |
| Google login | Dashboard → Providers → Google → disable; legacy password form is still on the page | instant |
| Trigger | `CREATE OR REPLACE FUNCTION public.handle_new_auth_user() …` from `handle_new_auth_user_backup_v1` (`pg_get_functiondef` + rename) | 1 min |
| Hook function | `DROP FUNCTION public.hook_restrict_signup(jsonb);` (after disabling the hook) | instant |
| Code | `git revert` of the Phase 1 commits; old routes were never deleted | minutes |
