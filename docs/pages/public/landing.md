# Landing Page — `/`

> The public marketing entry point.

## Purpose
This is the front door of StartSchool. Anonymous visitors land here from the marketing channel and returning users may pass through on their way to `/login`. It exists to communicate the product proposition in one screen.

The route is publicly classified in middleware, so unauthenticated visitors are welcome. Authenticated users who navigate here directly are not redirected — the page simply renders the hero.

## What it does
- Renders the marketing hero ([`HeroLanding`](src/components/hero-landing.tsx)) with the StartSchool logo, the phase overview and a single primary CTA pointing at `/login`.
- Nothing else. It is a server component with no state, no effects and no Supabase call.

## How it looks
Whatever `HeroLanding` renders — see that component. The page itself is a full-height `<main>` wrapper.

## Thought behind it
Until 2026-09-15 this page doubled as a silent invitation router: it read Supabase invite tokens out of `window.location.hash`, called `supabase.auth.setSession`, and forwarded the user to `/profile/setup` behind a "Setting up your invitation" spinner. Accounts are now created only by Google sign-in (`/login` → `/auth/callback`), so the hash handler, the `isProcessingInvite` state, the Framer Motion swap and the browser Supabase client were all removed and the page became a plain server component.

## Wired-up bits
- **Page file:** [`src/app/page.tsx`](src/app/page.tsx)
- **Key components:** [`src/components/hero-landing.tsx`](src/components/hero-landing.tsx)
- **Hooks:** none
- **RPCs / API routes:** none
- **Auth requirement:** public
- **Notable types or schemas:** none
