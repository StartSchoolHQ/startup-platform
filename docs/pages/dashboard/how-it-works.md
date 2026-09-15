# How it works — `/dashboard/how-it-works`

> A quick guide to the platform for students, told as one route in programme order.

## Purpose

New students land in My Journey with a list of tasks and little context. This page answers "what is this place and what happens next?" in one read: sign in, My Journey and the AI reviewer, the weekly report, the leaderboard and founder cards, Team Journey later, where to ask for help. Added 2026-09-15 together with the retirement of the Overview page; sits in the sidebar between Leaderboard (or the Team Journey pages, when on) and Support.

## What it does

- Renders a static header and a vertical route of stops. Each stop is a ring marker on a track, a title, one or two short paragraphs, and optional outline buttons that deep-link into the app.
- Copy is phase-aware through `usePlatformSettings()` (already cached app-wide): the My Journey and weekly report stops only appear while My Journey is on; the Team Journey stop reads "comes next" (muted marker, dashed track) while Team Journey is off and "Build with your team" with links when it is on.
- Unit names come from `economyLabels()` so a wording change there flows through. No database query of its own.

## How it looks

Left-aligned, `max-w-3xl`. One large tracking-tight headline ("From your first task to your first team."), a one-sentence subtitle, then the track. Markers are 40–48px rings in the primary colour echoing the phase rings on My Journey; the track between stops is a 2px solid line, dashed towards a stop that is not open yet. No cards, no eyebrow labels, no motion.

## Wired-up bits

- **Page file:** [`src/app/dashboard/how-it-works/page.tsx`](../../../src/app/dashboard/how-it-works/page.tsx)
- **Components:** [`RouteStop`](../../../src/components/how-it-works/route-stop.tsx) (marker + track + content), [`buildRouteStops`](../../../src/components/how-it-works/route-stops.tsx) (the copy, phase-aware)
- **Hooks:** `usePlatformSettings()`
- **Nav:** `navMainItems` in [`app-sidebar.tsx`](../../../src/components/app-sidebar.tsx); breadcrumb label in `dashboard-layout-client.tsx`
- **Auth requirement:** authenticated (`/dashboard/**` prefix in `route-classification.ts`)

## Keeping it true

The copy states facts that live elsewhere: Google sign-in with `@startschool.org` only (`hook_restrict_signup`), phases unlock at half of the previous phase (`my_journey_phase_unlocked_v1`, 50% hard-coded), weekly report due Monday 10:00 Riga time (weekly-report card / reminders), AI review with unlimited attempts (`docs/documentation/ai-task-review.md`). Change one of those and update the stop.
