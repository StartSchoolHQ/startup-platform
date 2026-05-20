# Reset Password — `/auth/reset-password`

> Form for setting a new password after clicking a Supabase password-recovery email.

## Purpose
This is the destination for the recovery email link that Supabase sends when a user clicks "Forgot password?" on `/login`. Its sole job is to take the recovery session that Supabase has automatically established from the URL hash and let the user write a new password against it. The route is public because the visitor doesn't have a "real" logged-in session yet — they have a short-lived recovery session that authorizes exactly one `updateUser({ password })` call.

If a non-authenticated user navigates here directly (no recovery hash in the URL), the page bounces them to `/login`.

## What it does
- On mount, if the URL hash contains `access_token`, waits 100ms for the Supabase client to absorb it.
- Calls `supabase.auth.getUser()`. No user → `router.push("/login")`.
- Authenticated → flips `isValidating` to false and renders the form.
- Form is two fields delivered by the shared [`PasswordInput`](src/components/ui/password-input.tsx) component (password + confirm).
- Submit validation: non-empty password, length ≥ 8, password matches confirm. Errors render in the red banner with a shake animation.
- On valid submit, calls `supabase.auth.updateUser({ password })`. Failure surfaces the Supabase error message; success calls `router.push("/dashboard")` followed by `router.refresh()` to flush server data.
- Disables fields during submission; submit button shows a `Loader2` spinner with "Updating Password..." copy.

## How it looks
Standard blue grid canvas. Centered glassy `Card` capped at `max-w-md`. Header: "Reset Password" (large white title) + "Enter your new password below" (zinc subtitle). Body: optional red error banner at the top, then `PasswordInput` (two stacked password fields), then a full-width pink submit button with hover scale. Pre-validation state shows a small zinc spinner with "Validating access..." copy on the same canvas.

Compared to login and profile setup, the typography is slightly larger here — `text-3xl` title vs `text-2xl` — to anchor the user mid-recovery flow.

## Thought behind it
This page is the simplest member of the public auth set on purpose: one job, two fields, one outcome. Mirroring `/profile/setup`'s `PasswordInput` and validation rules keeps password rules consistent across every place a password is entered, so users don't get accepted on one screen and rejected on another. The 100ms wait for hash processing is a copy of the trick used in profile setup — Supabase needs a tick to swallow the recovery token before `getUser()` returns truthy, and skipping the wait causes spurious redirects to login.

Pushing to `/dashboard` (rather than back to login) on success is deliberate: the user just proved ownership of the email, they're already authenticated, forcing them to type the new password again would be theatre. The follow-up `router.refresh()` is what makes Server Components on the dashboard re-fetch with the now-fresh session cookie.

The page does not show password strength meters, breach checks, or "remember me" toggles — none of those things exist elsewhere in the product, and adding them here would be a one-off.

## Wired-up bits
- **Page file:** [`src/app/auth/reset-password/page.tsx`](src/app/auth/reset-password/page.tsx)
- **Key components:** [`src/components/ui/password-input.tsx`](src/components/ui/password-input.tsx), ShadCN `Card`, `Button`
- **Hooks:** `useRouter`, `useEffect`, `useState` (no custom hooks)
- **RPCs / API routes:** none. Direct Supabase calls: `supabase.auth.getUser()`, `supabase.auth.updateUser({ password })`
- **Auth requirement:** public route in middleware; page itself requires the recovery session and bounces to `/login` otherwise
- **Notable types or schemas:** no Zod schema — inline length and match validation only
