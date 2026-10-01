# Root — `/`

> No landing page. The root redirects.

## Purpose
The platform is members-only (Google sign-in, `@startschool.org` accounts), so there is no public marketing page. `/` only routes the visitor to the right place.

## What it does
- Server component. Reads the session with the cookie-based Supabase client and calls `redirect()`:
  - signed in → `/dashboard`
  - otherwise → `/login`
- The route stays publicly classified in middleware so the middleware never touches it; the page itself does the routing.

## Thought behind it
Until 2026-09-15 this page was a silent invitation router (Supabase invite tokens read from the URL hash, then `/profile/setup`). From 2026-09-15 to 2026-10-01 it rendered a marketing hero (`HeroLanding`) explaining the programme. That content became stale once invites were replaced by Google SSO, and its explanatory job moved in-app to How it works, where every first sign-in lands. The hero was deleted on 2026-10-01 and the root became a redirect.

## Wired-up bits
- **Page file:** [`src/app/page.tsx`](src/app/page.tsx)
- **Key components:** none
- **Hooks:** none
- **RPCs / API routes:** none
- **Auth requirement:** public (redirects by session)
- **Notable types or schemas:** none
