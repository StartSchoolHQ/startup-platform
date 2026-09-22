# Login — `/login`

> Google sign-in for everyone with an `@startschool.org` Workspace account; the legacy email + password form stays behind a "Use password instead" toggle until Phase 2 removes it.

## Purpose
The only authentication entry. A first-time student clicks "Continue with Google" and gets an account automatically (gated server-side by the `before_user_created` hook — only Google + `@startschool.org`). A returning user does the same and lands on the dashboard. Existing password accounts, including the two gmail students, link their Google identity on the first Google sign-in with the same email. The route is public; signed-in users are no longer bounced away from `/login`, so a legacy user can come back here to link Google.

## What it does
- `GoogleSignInButton` calls `supabase.auth.signInWithOAuth({ provider: "google" })` on the browser client (PKCE), with `prompt=select_account` and `redirectTo = <origin>/auth/callback?next=/dashboard`. Fires `google_sign_in_started` / `google_sign_in_failed`.
- `/auth/callback` exchanges the code, waits for the `public.users` row, and redirects to `/profile/setup` when name or avatar is missing, otherwise to `next`. OAuth or hook errors (`?error=`) land on `/auth/auth-code-error` with the human message.
- "Use password instead" reveals the unchanged `LoginForm` (`signInWithPassword`, forgot-password reset with 60 s cooldown). Its "wrong credentials" hint now points new users at the Google button.
- Footer links to `/policy` and `/terms` (required by the Google consent screen).

## How it looks
Two-column layout: dark brand panel with greeting on the left, form panel on the right. The form panel is one outline "Continue with Google" button with the Google mark, a small "Use password instead" toggle underneath, and the collapsed password form.

## Thought behind it
An `@startschool.org` account *is* the invitation, so the page offers no signup and no invite hints. Enforcement is in the database hook, not the button (`hd` is deliberately not set, so people with several Google accounts see the picker). The password form is kept one click away as an instant rollback if the Google provider misbehaves; deleting it is a separate, later decision.

## Wired-up bits
- **Files:** `src/app/login/page.tsx`, `src/components/auth/login-methods.tsx`, `src/components/auth/google-sign-in-button.tsx`, `src/components/auth/login-form.tsx`, `src/app/auth/callback/route.ts`, `src/app/auth/auth-code-error/page.tsx`
- **DB:** `public.hook_restrict_signup(jsonb)` (Before User Created hook), `handle_new_auth_user` v2 trigger
- **Analytics:** `google_sign_in_started`, `google_sign_in_failed`, `user_authenticated` (callback, `auth_method` = provider), `user_login_success`, `user_login_failed`, `password_reset_requested`
- **Docs:** `docs/internal/GoogleSSO/2026-08-27-google-sso-invite-gate-design.md`
