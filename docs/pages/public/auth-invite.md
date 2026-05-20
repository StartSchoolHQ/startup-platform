# Invite Acceptance (V2) — `/auth/invite`

> Lean invitation handler that trusts the DB trigger to create the `users` row, then routes to profile setup or dashboard based on completeness.

## Purpose
This is the modern, opinionated counterpart to [`/invite`](docs/pages/public/invite.md). It exists because the older invite route grew defensive workarounds for trigger lag and dual auth flows; this route assumes the auth trigger always creates a `public.users` row and just waits for it via [`waitForProfile`](src/lib/profile-utils.ts). It is the destination for newer Supabase email templates that send users to `/auth/invite`.

The route is public. It's a transient page — no user ever stays on it longer than a couple of seconds.

## What it does
- On mount, calls `supabase.auth.getSession()` to read the session that Supabase has already populated from the URL hash.
- On error → `router.push("/login?error=invalid_invitation")`.
- On no session → `router.push("/login")`.
- On valid session, calls `waitForProfile(supabase, user.id)` from [`src/lib/profile-utils.ts`](src/lib/profile-utils.ts), which polls `public.users` with exponential backoff (50ms → 100ms → 200ms → 400ms → 800ms, ~1.5s total) to handle the trigger race.
- If `waitForProfile` returns `null` after retries → `router.push("/login?error=profile_not_found")`.
- Calls `isProfileComplete(profile)` (returns `true` if `profile.name` is set; avatar is treated as optional by the helper) and routes:
  - Incomplete → `/profile/setup`
  - Complete → `/dashboard`

## How it looks
A single state: blue grid canvas, centered Framer-Motion-faded spinner (pink ring on dark), caption "Processing invitation...". No card, no error UI here — every error path redirects rather than rendering, so the user never reads an error message on this URL.

## Thought behind it
The split between this route and `/invite` is the V2 pattern in action. Rather than rewrite the older route and risk breaking live email links pointing at `/invite`, the team built `/auth/invite` cleaner from scratch and migrated new flows to it. The behaviour is intentionally narrower: no PKCE handling, no defensive `users.insert` — the contract is "if the trigger didn't fire, that's a real bug, fail loudly". `waitForProfile` is the only concession to async DB reality, and its 1.5-second budget is calibrated to be invisible to humans but generous enough for the trigger.

The page renders nothing useful on screen because every meaningful outcome is a redirect. The spinner exists purely to absorb the 200ms-to-1.5s window where the page is actively polling. There is deliberately no "go to login" button here — failure paths terminate at `/login` with a query param and let that page decide what to show.

Note the subtle policy difference: `isProfileComplete` here only requires `name`, while [`/profile/setup`](docs/pages/public/profile-setup.md) enforces an avatar at submit time. That means a user with `name` but no avatar will be routed to `/dashboard`, not back to setup — be aware if you change either side of that contract.

## Wired-up bits
- **Page file:** [`src/app/auth/invite/page.tsx`](src/app/auth/invite/page.tsx)
- **Key components:** none beyond Framer Motion wrappers
- **Hooks:** `useRouter`, `useEffect`. Helpers: [`waitForProfile`, `isProfileComplete`](src/lib/profile-utils.ts)
- **RPCs / API routes:** none. Direct Supabase calls: `supabase.auth.getSession()`, `supabase.from("users").select(...)` (inside `waitForProfile`).
- **Auth requirement:** public (the page is part of establishing the session)
- **Notable types or schemas:** `UserProfile` interface declared inline in `profile-utils.ts` (`id`, `name`, `avatar_url`, `email`).
