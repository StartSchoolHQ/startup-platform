# Login — `/login`

> Email-and-password sign-in with inline validation, password reset request, and PostHog event tracking.

## Purpose
This is the only authentication entry for returning users. Invited users who have completed profile setup return here to sign in; anyone who clicks "Forgot password?" requests a reset email from this page. The route is public; the middleware redirects already-authenticated users hitting `/login` to `/dashboard`, so this page never renders for someone who already has a session.

## What it does
- Two-field form (email, password) plus a "Forgot password?" action button.
- Email field validates against a basic regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) on blur and on subsequent keystrokes once an error has appeared. Invalid email shows a red border plus inline message.
- Submit calls `supabase.auth.signInWithPassword({ email, password })` on the browser client.
- On success: fires a PostHog `user_login_success` event and routes to `/dashboard`.
- On failure: fires `user_login_failed` (capturing `error_message` and `email`). For `Invalid login credentials`, the page shows a tailored hint suggesting the user may have an unfinished invitation and should contact an admin.
- "Forgot password?" requires the email field to be filled, then calls `supabase.auth.resetPasswordForEmail(email)`. On success, fires `password_reset_requested`, surfaces an inbox-check message in the error banner slot, and starts a 60-second cooldown counter on the button label ("Wait Ns").
- Disables form inputs and the submit button during async work; the submit button shows a `Loader2` spinner with "Signing in...".

## How it looks
Same blue grid canvas as the rest of the public surface. Centered glassy `Card` (`bg-zinc-900/80` with backdrop blur) capped at `max-w-md`. Header reads "Welcome Back" in pink with a "Sign in to continue building your startup" subtitle. Form stack: Email Label + Input, Password Label + Input, full-width pink submit button with a hover light-sweep animation, and a small zinc text link below the button for password reset.

Errors render as a red-tinted banner at the top of the form with an `AlertCircle` icon, a shake animation on appearance, and an `X` close button. Field-level email errors render as small red text under the input. Framer Motion staggers the entrance of each form section.

## Thought behind it
The form is intentionally minimalist — two inputs and one CTA — because anything richer would slow down the dominant case (a returning student logging in twice a week). The clever bit is the failure copy: a generic "Invalid credentials" is upgraded to suggest the user may be an invitee who never finished setup, which is the single most common confused-user support ticket on an invitation-only platform.

The 60-second cooldown on password reset is friction by design: it stops accidental double-taps from hammering the email provider's send-rate limits and gives users immediate proof that something happened. The page deliberately does not offer "Sign up" — StartSchool is invitation-only, and exposing a signup form would be a lie. PostHog tracking on both success and failure is what makes login funnel debugging possible without adding server logs.

## Wired-up bits
- **Page file:** [`src/app/login/page.tsx`](src/app/login/page.tsx)
- **Key components:** ShadCN `Card`, `Button`, `Input`, `Label` (UI primitives only)
- **Hooks:** `useRouter`, `useEffect`, `useState`
- **RPCs / API routes:** none directly. Calls `supabase.auth.signInWithPassword()` and `supabase.auth.resetPasswordForEmail()` on the browser client.
- **Auth requirement:** public (middleware redirects authenticated users to `/dashboard`)
- **Notable types or schemas:** inline regex email validation, no Zod (input is consumed directly by Supabase Auth which performs its own validation)
- **Analytics:** PostHog events `user_login_success`, `user_login_failed`, `password_reset_requested`
