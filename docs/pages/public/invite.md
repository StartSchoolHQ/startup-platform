# Invite Acceptance (legacy/long path) — `/invite`

> A defensive landing route that accepts both PKCE and implicit-flow Supabase invitations, ensures a `users` row exists, then routes to profile setup or dashboard.

## Purpose
This route handles the "I clicked the invitation link in my email" case when the link points to `/invite` rather than the sibling `/auth/invite`. It exists because Supabase invitation links can arrive in two shapes — PKCE (`?code=...`) or implicit (`#access_token=...&type=invite`) — and the page must absorb both without the user noticing. It also acts as a safety net: if the DB trigger that mirrors `auth.users` into `public.users` hasn't fired yet, this page inserts a stub row directly so downstream pages don't crash.

The route is public in middleware. Anyone hitting it without a session ends up bounced into the error UI rather than an infinite loop.

## What it does
- On mount, reads `window.location.hash` and `searchParams.get("code")`.
- For implicit-flow invites (`hash.includes("access_token") && hash.includes("type=invite")`): pauses 1 second to let the Supabase client absorb the hash tokens.
- For PKCE-flow invites (`?code=...`): calls `supabase.auth.exchangeCodeForSession(code)`. Failure → error state with "Failed to process invitation. Please try again."
- Calls `supabase.auth.getSession()` to confirm a session was established.
- Queries `public.users` for the current user's id, name, avatar_url, email.
- If the query returns `PGRST116` (no row), inserts a stub row directly via `supabase.from("users").insert({ id, email, name: null, avatar_url: null })`. Insert failure → error state.
- Branches on profile completeness: missing name OR missing avatar → `router.push("/profile/setup")`. Both present → `router.push("/dashboard")`.
- No session at all → error state with "No valid session found. Please try the invitation link again."
- Wraps the whole client component in a `Suspense` boundary so `useSearchParams` can be used safely under Next 16's static generation.

## How it looks
Standard blue grid canvas. Three states swapped by `AnimatePresence`:
1. **Processing** (default): centered pink-bordered spinner with "Processing your invitation..." caption.
2. **Redirecting**: same spinner, caption changes to "Redirecting you...".
3. **Error**: glassy `max-w-sm` card with a red `AlertCircle` chip, "Invitation Error" title, the human-readable error message, and a pink full-width "Go to Login" button that pushes `/login`.

The Suspense fallback is a near-identical spinner with "Loading invitation..." copy so there's no layout shift while `useSearchParams` resolves.

## Thought behind it
This page is paranoid by design. Email clients mangle URLs in unpredictable ways, Supabase shipped two competing OAuth flow shapes, and DB triggers can lag a few hundred milliseconds behind the auth event. Rather than argue about which flow is canonical, the page tries both and writes a defensive `users` insert if the trigger hasn't caught up. That insert is intentionally minimal (id + email + nulls) — just enough to satisfy foreign keys downstream so the user isn't trapped in a 404 loop while the trigger eventually catches up.

Compared to [`/auth/invite`](docs/pages/public/auth-invite.md), this version is the older, more forgiving one — it does its own retry-and-insert dance instead of leaning on the `waitForProfile` helper. It's kept around as the public-facing invitation URL because the email templates already point here; the `/auth/invite` route is the cleaner V2 used by newer flows. The error UI is friendly but final: instead of offering a retry button, it sends the user to login because retrying a one-shot invite token never works.

## Wired-up bits
- **Page file:** [`src/app/invite/page.tsx`](src/app/invite/page.tsx)
- **Key components:** ShadCN `Button` only
- **Hooks:** `useRouter`, `useSearchParams`, `useEffect`, `useState`, `Suspense`
- **RPCs / API routes:** none. Direct Supabase calls: `supabase.auth.exchangeCodeForSession()`, `supabase.auth.getSession()`, `supabase.from("users").select(...)`, `supabase.from("users").insert(...)`
- **Auth requirement:** public (the page's whole job is to establish a session)
- **Notable types or schemas:** relies on PostgREST error code `PGRST116` to detect "no row found" and trigger the stub insert.
