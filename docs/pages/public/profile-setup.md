# Profile Setup — `/profile/setup`

> First-run onboarding form where invited users set name, avatar, and password before reaching the dashboard.

## Purpose
This is the bridge between "Supabase auth user exists" and "platform user is ready to participate". An invited user lands here from the landing page invite handler or from `/auth/invite`; a password-recovery user can also land here in some flows. The page makes sure every authenticated account has the three things the rest of the product assumes: a real name, a profile picture, and a password they chose themselves. Without this step, dashboards show empty avatars and the user can't sign back in after their session expires.

The route is listed as public in middleware (because new invitees may technically not have a complete profile yet), but the page itself enforces auth client-side and bounces unauthenticated visitors to `/login`.

## What it does
- On mount, validates access: if the URL hash contains `access_token`, waits 100ms for Supabase to swallow the token, then calls `supabase.auth.getUser()`. No user → redirect to `/login`.
- Pre-fills the name field from `user.user_metadata.first_name` + `last_name` if the inviter provided them, and locks the field (`disabled`, opacity 60%) with a "Name pre-filled from invitation" hint.
- Avatar uploader: validates file type (must start with `image/`), enforces a 5 MB cap, generates an object URL preview, and stores the `File` in state.
- Password fields rendered via the shared [`PasswordInput`](src/components/ui/password-input.tsx) component with an explicit confirm-password second field.
- Submit validation (in order): non-empty name, avatar file selected, non-empty password, password ≥ 8 chars, password matches confirm.
- On submit:
  1. Re-fetches the auth user.
  2. Uploads the avatar to the `avatars` Supabase Storage bucket at `{user.id}/avatar-{Date.now()}.{ext}` with `upsert: true`, retrieves the public URL.
  3. Calls `supabase.auth.updateUser({ password })` to set the chosen password.
  4. POSTs `{ name, avatarUrl }` to `/api/profile/setup`, which calls the `update_user_profile` RPC server-side (the `public.users` row is assumed to already exist from a DB trigger).
  5. Fires PostHog `user_profile_setup_completed` with `has_avatar: true` and `name_prefilled` flags.
  6. `router.push("/dashboard")` then `router.refresh()` to invalidate server data.
- All errors surface inline in the red banner at the top of the form.

## How it looks
Same blue grid canvas. Centered glassy `Card` capped at `max-w-md`. Header: "Complete Your Profile" in pink + "Please provide your details to get started" in zinc. Form stack from top to bottom:
1. Avatar block — 80×80 circular `Avatar` preview (showing "No image" fallback or the selected image), next to a styled file input with pink "file:" button styling and a "JPG, PNG or GIF (max 5MB)" hint.
2. Full Name input, conditionally disabled if pre-filled.
3. `PasswordInput` (password + confirm with shared component conventions).
4. Pink full-width "Complete Setup" button with `Loader2` spinner and "Setting up your profile..." copy during submission.

Pre-validation state shows a centered spinner with "Validating access..." against the same blue grid. Form sections animate in with staggered Framer Motion delays.

## Thought behind it
The order of operations matters more than the form itself. Avatar upload must complete before the password update because if storage fails mid-flow, the user still has their old (or null) password and can retry. The password update happens before the profile RPC so that when `update_user_profile` succeeds, every Supabase auth side-effect has already settled — no half-baked accounts.

Pre-filling and locking the name is an opinion: the inviter (an admin) typed the user's real name when sending the invite, so letting the user re-type it invites typos and "Bob" vs "Robert" inconsistencies that show up later in leaderboards. Avatar is required, not optional, because the rest of the UI assumes a face: empty avatars in tasks, peer reviews, and team views look broken. The 5 MB ceiling and image-only filter exist to keep storage costs predictable and avoid weird `file:///` content-types breaking the public URL.

The page deliberately does not collect bio, role, social links, or anything else — those belong in a settings page later, not in the gate between sign-up and first value.

## Wired-up bits
- **Page file:** [`src/app/profile/setup/page.tsx`](src/app/profile/setup/page.tsx)
- **Key components:** [`src/components/ui/password-input.tsx`](src/components/ui/password-input.tsx), ShadCN `Avatar`, `Card`, `Button`, `Input`, `Label`
- **Hooks:** `useRouter`, `useEffect`, `useState` (no custom hooks)
- **RPCs / API routes:** `POST /api/profile/setup` → calls `update_user_profile` RPC. Direct browser calls to `supabase.auth.getUser()`, `supabase.auth.updateUser()`, `supabase.storage.from("avatars").upload()`/`.getPublicUrl()`.
- **Auth requirement:** public route in middleware, but page redirects to `/login` if no Supabase user is present
- **Notable types or schemas:** no Zod schema — validation is inline. The API route trims `name` and passes `avatarUrl ?? null` to the RPC.
- **Storage:** `avatars` bucket, path pattern `{userId}/avatar-{timestamp}.{ext}`, `upsert: true`, `cacheControl: "3600"`
- **Analytics:** PostHog `user_profile_setup_completed`
