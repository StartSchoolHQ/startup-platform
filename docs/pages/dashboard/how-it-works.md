# How it works — `/dashboard/how-it-works`

> A quick guide to the platform for students, told as one route in programme order.

## Purpose

New students land in My Journey with a list of tasks and little context. This page answers "what is this place and what happens next?" in one read: sign in, My Journey and the AI reviewer, the weekly report, the leaderboard and founder cards, Team Journey later, where to ask for help. Added 2026-09-15 together with the retirement of the Overview page; sits in the sidebar between Leaderboard (or the Team Journey pages, when on) and Support. Since 2026-09-28 it is also the first page a new account sees: finishing the founder card on `/profile/setup` pushes here instead of `/dashboard` (colleagues reported landing in the task list with no context on first sign-in).

## What it does

- Renders a static header and a vertical route of stops. Each stop is a ring marker on a track, a title, one or two short paragraphs, and optional outline buttons that deep-link into the app. Since 2026-09-21 the weekly report stop also carries an action button ("Write this week's report" / "Continue draft") that opens `IndividualWeeklyReportModal` in place — shown only while the solo form applies (`useSoloWeeklyReportMode`) and this week's report is not yet submitted (`get_individual_weekly_report_status_v1`). That is the page's one live query.
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

The copy states facts that live elsewhere: Google sign-in with `@startschool.org` only (`hook_restrict_signup`), phases unlock at 75% of the previous phase (`my_journey_phase_unlocked_v1`, 75% hard-coded since 2026-10-09), weekly report due Monday 10:00 Riga time (weekly-report card / reminders), AI review with unlimited attempts (`docs/documentation/ai-task-review.md`). Change one of those and update the stop.

## Programme timeline

Under the route sits the **programme timeline** (added 2026-09-29, re-planned 2026-10-09 from the programme board): one horizontally scrolling day scale from 7 Sep 2026 to 17 Jan 2027 with a sticky month/week ruler and a today line the board scrolls to on load.

- **Lanes, top to bottom:** Startup Module curriculum (one cell per month, goals + topic pills, January = hackathon prep and the Building Hackathon), My Journey phases (four overlapping bars with their planned windows and task counts; under each phase start a label with the real unlock rule, e.g. "Opens at 9 of 11 Phase 1 tasks approved (75%)"; the holiday buffer and the two January hackathon weeks as dashed milestones), Tasks (every planned solo task as a card with its phase colour, planned days and effort; six tasks carry a dashed "waits until" tail for the days spent waiting for replies), Reading (The Mom Test and Mindset, own pace, deadline 20 Dec) and Recurring (four rows, a dot per planned date).
- **Content is static** in `src/components/how-it-works/timeline/timeline-data.ts`; task titles must match `tasks.title`. Pure scale and row-packing helpers in `timeline-scale.ts`; lanes in `timeline-lanes.tsx` / `timeline-lanes-top.tsx`; colours in `phase-colors.ts`. Tests under `tests/how-it-works/`.
- **Deliberately not on the board:** a "create your profile" step (profile setup is forced before the dashboard, there is no task for it) and the Founder Reading List books (always open, no planned dates).
- **Next batch:** edit the dates in `timeline-data.ts`, extend `RANGE_END` in `timeline-scale.ts` if the programme runs longer, and keep the `opensAt` strings in step with the SQL rule.
