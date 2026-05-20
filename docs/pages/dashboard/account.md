# Account Settings — `/dashboard/account`

> Self-service profile and password management for the signed-in user.

## Purpose
The single place where a user manages who they are inside the platform: their display name, avatar, and login password. Visited rarely but at high-value moments — first login, after an avatar embarrasses them in the leaderboard, or when rotating credentials. Email and role are intentionally not editable here.

## What it does
- Loads the current user via `supabase.auth.getUser()`, then fetches `id, name, email, avatar_url` from the `users` table. Redirects to `/login` on auth failure.
- Profile form — edits full name and avatar:
  - Avatar upload validated client-side: image MIME type and 5MB max. Preview is shown immediately via `URL.createObjectURL` before save.
  - On submit, uploads the file to the `avatars` Supabase Storage bucket at `<userId>/avatar-<timestamp>.<ext>` with `upsert: true`, then resolves a public URL.
  - Persists name + avatar URL through the `update_user_profile` RPC (security-definer pattern — the route does not write the `users` row directly from the client).
  - Surfaces success/failure via Sonner toasts; the validation error block at the top covers field-level problems (empty name, oversized file, wrong type).
- Password form — uses the shared [`PasswordInput`](src/components/ui/password-input.tsx) component for entry and confirmation. Validates the two fields match and minimum length 8, then calls `supabase.auth.updateUser({ password })`. Clears fields on success.
- Loading skeleton mirrors both cards while data resolves; an error card with a Retry button renders if profile load fails.
- Email field is rendered disabled with the helper text "Email cannot be changed from this page".

## How it looks
Centred container, max width inherited from the layout. From top:
1. **Header row** — back button (`router.back()`), `h1` "Account Settings", muted subline.
2. **Inline error banner** — red-bordered block, only when `validationError` is set.
3. **Profile Information [`Card`](src/components/ui/card.tsx)** — avatar block with a 20x20 [`Avatar`](src/components/ui/avatar.tsx) + initials fallback, a "Change photo" link styled in the brand pink (`#ff78c8`) that triggers a hidden file input, separator, name `Input`, disabled email `Input`, right-aligned Save button with `Loader2` spin during `saving`.
4. **Change Password Card** — `PasswordInput` pair + right-aligned Update Password button, same pink primary styling.

The whole content area is wrapped in two staggered `motion.div` fade-and-rise transitions for a calm reveal. Section spacing is generous (`space-y-6`) to make this feel like a settings screen rather than a dashboard.

## Thought behind it
Account settings should feel boring and predictable on purpose — this is where users come to fix something or change something sensitive, and surprise is the enemy. Two cards, clearly labelled, no marketing flourish. The deliberate omissions tell the story: email is read-only because it is the auth identity and changing it is a flow we do not want to support inline; primary role and team membership are not here because they belong to admin and team-journey surfaces respectively. Password update piggybacks on Supabase Auth rather than a custom RPC because re-auth, hashing, and session rotation are problems we should not own. Avatar uploads go through a public bucket with a per-user folder prefix and a timestamp suffix — this keeps URLs cache-friendly while side-stepping cache invalidation pain when a user re-uploads. The brand pink (`#ff78c8`) only appears on the two primary submit buttons; everywhere else is neutral, which keeps the page calm but makes the action obvious.

## Wired-up bits
- **Page file:** [`src/app/dashboard/account/page.tsx`](src/app/dashboard/account/page.tsx)
- **Key components:** [`Avatar`](src/components/ui/avatar.tsx), [`PasswordInput`](src/components/ui/password-input.tsx), [`Card`](src/components/ui/card.tsx), [`Input`](src/components/ui/input.tsx), [`Separator`](src/components/ui/separator.tsx), [`Skeleton`](src/components/ui/skeleton.tsx)
- **Hooks:** local `useState` / `useEffect` / `useCallback` (no React Query here — single fetch on mount), `useRouter`
- **RPCs / API routes:** `update_user_profile(p_name, p_avatar_url)` Supabase RPC; `supabase.storage.from("avatars").upload(...)`; `supabase.auth.updateUser({ password })`
- **Auth requirement:** authenticated (layout-enforced); page also re-checks `getUser()` on mount and routes to `/login` if missing
- **Notable types or schemas:** local `UserProfile` interface; RPC response typed as `{ success: boolean; error?: string }`
