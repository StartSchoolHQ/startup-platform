# Landing Page — `/`

> The public marketing entry point that doubles as a silent invitation router for newly invited users.

## Purpose
This is the front door of StartSchool. Anonymous visitors land here from the marketing channel, students arrive here from a Supabase invitation email, and returning users may pass through on their way to `/login`. It exists to communicate the product proposition in one screen and route invited users into the auth flow without forcing them to think.

The route is publicly classified in middleware, so unauthenticated visitors are welcome. Authenticated users who navigate here directly are not redirected — the page simply renders the hero.

## What it does
- Renders the marketing hero ([`HeroLanding`](src/components/hero-landing.tsx)) with the StartSchool logo, tagline, and a single primary CTA pointing at `/login`.
- On mount, inspects `window.location.hash` for Supabase invitation tokens (`access_token` + `type=invite`).
- If those tokens are present, parses `access_token`, `refresh_token`, `expires_in`, `token_type` from the hash, calls `supabase.auth.setSession({ access_token, refresh_token })`, clears the hash from the URL, and redirects to `/profile/setup`.
- If the hash contains `error=` (e.g. expired invite), forwards `error_description` (or `error`) to `/auth/invite-expired?error=...`.
- On any failure path during invite processing, redirects to `/login` with a query flag (`?error=missing_tokens`, `?error=session_failed`, `?error=processing_failed`).
- Shows an animated "Processing invitation..." spinner state while the hash exchange runs, swapping in via `AnimatePresence`.

## How it looks
A full-bleed deep blue (`#0000dd`) canvas with a subtle white grid background. Centered content: a small "New: Launch Your Startup Today" pill, the StartSchool wordmark image (`public/images/startschool-logo.png`), the "Startup Module Platform" headline, a one-liner subhead, and a single rounded pink (`#ff78c8`) CTA labelled "Login and Create Your Own Startup!" linking to `/login`. Below the CTA: a "Created by" credit row with two LinkedIn-linked author cards. Two soft pink blurred orbs drift behind the content; on the client, twenty pink particles float upward as ambient motion.

When invite processing is active, the hero is replaced by a centered spinner with the caption "Processing invitation..." on the same blue grid background. Transitions use Framer Motion fades.

## Thought behind it
The landing has to do two contradictory jobs gracefully: sell the product to a stranger and disappear for someone who already clicked an invite email. The design solves this by keeping all invite logic inside `useEffect` so the hero is never visible to invited users — they see a brief spinner and land on profile setup, never confused by marketing copy meant for somebody else.

The visual choices commit to brand: a single saturated brand color (`#0000dd`) plus one accent (`#ff78c8`) and grid lines, no stock imagery, no trust badges, no feature grid. The page deliberately does not list features, pricing, or testimonials — StartSchool is invitation-only at this stage, so a feature dump would lie about how the product is acquired. The CTA wording ("Create Your Own Startup!") frames the platform as agency rather than tooling, matching the accelerator narrative.

## Wired-up bits
- **Page file:** [`src/app/page.tsx`](src/app/page.tsx)
- **Key components:** [`src/components/hero-landing.tsx`](src/components/hero-landing.tsx)
- **Hooks:** `useRouter`, `useEffect`, `useState` (no custom hooks)
- **RPCs / API routes:** none directly. Calls `supabase.auth.setSession()` on the browser client.
- **Auth requirement:** public
- **Notable types or schemas:** none. Hash parsing uses `URLSearchParams` against the raw `window.location.hash`.
