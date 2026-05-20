# Pages Documentation

One overview document per page of the StartSchool platform. Each doc follows the same structure: **Purpose → What it does → How it looks → Thought behind it → Wired-up bits**.

These docs are grounded in the actual code at the time of writing. They will rot — when a page changes meaningfully, update the corresponding doc.

## Public / Auth

Public-facing pages and the auth flow before a user reaches the dashboard.

- [Landing](./public/landing.md) — `/`
- [Login](./public/login.md) — `/login`
- [Profile Setup](./public/profile-setup.md) — `/profile/setup`
- [Invite (legacy)](./public/invite.md) — `/invite`
- [Auth Invite](./public/auth-invite.md) — `/auth/invite`
- [Reset Password](./public/auth-reset-password.md) — `/auth/reset-password`
- [Invite Expired](./public/auth-invite-expired.md) — `/auth/invite-expired`
- [Full Scholarship Agreement](./public/full-scholarship-agreement.md) — `/full-scholarship-agreement`
- [Partial Scholarship Agreement](./public/partial-scholarship-agreement.md) — `/partial-scholarship-agreement`
- [Agreement Identity Callback](./public/agreement-identity-callback.md) — `/agreement/identity-callback`
- [Agreement Thank-You](./public/agreement-thank-you.md) — `/agreement/thank-you/[id]`

## Dashboard — Core

The shell of the authenticated experience.

- [Dashboard Home](./dashboard/home.md) — `/dashboard`
- [Account](./dashboard/account.md) — `/dashboard/account`
- [Support](./dashboard/support.md) — `/dashboard/support`
- [Transaction History](./dashboard/transaction-history.md) — `/dashboard/transaction-history`

## Dashboard — Personal Journey

Individual task work: list, then per-task view.

- [My Journey (list)](./dashboard/my-journey.md) — `/dashboard/my-journey`
- [My Journey Task](./dashboard/my-journey-task.md) — `/dashboard/my-journey/task/[id]`

## Dashboard — Team Journey

Team-scoped operations: directory → team detail → team task. Drill-down flow.

- [Team Journey (directory)](./dashboard/team-journey.md) — `/dashboard/team-journey`
- [Team Journey Detail](./dashboard/team-journey-detail.md) — `/dashboard/team-journey/[id]`
- [Team Journey Task](./dashboard/team-journey-task.md) — `/dashboard/team-journey/task/[taskId]`

## Dashboard — Social

The motivation and collaboration loop: invitations → peer review → leaderboard.

- [Peer Review](./dashboard/peer-review.md) — `/dashboard/peer-review`
- [Leaderboard](./dashboard/leaderboard.md) — `/dashboard/leaderboard`
- [Invitations](./dashboard/invitations.md) — `/dashboard/invitations`

## Admin — Core

Operational surfaces: home, users, teams, tasks. Admins observe and manage.

- [Admin Home](./admin/home.md) — `/dashboard/admin`
- [Users](./admin/users.md) — `/dashboard/admin/users`
- [Teams](./admin/teams.md) — `/dashboard/admin/teams`
- [Tasks](./admin/tasks.md) — `/dashboard/admin/tasks`

## Admin — Advanced

Visibility, accountability, audit.

- [Peer Reviews](./admin/peer-reviews.md) — `/dashboard/admin/peer-reviews`
- [Progress](./admin/progress.md) — `/dashboard/admin/progress`
- [Weekly Reports](./admin/weekly-reports.md) — `/dashboard/admin/weekly-reports`
- [Audit Logs](./admin/audit-logs.md) — `/dashboard/admin/audit-logs`
- [Scholarship Agreements](./admin/agreements.md) — `/dashboard/admin/agreements`

---

## Cross-cutting findings (worth a follow-up)

These surfaced while documenting and aren't bugs to fix here, but they're recorded so they aren't lost.

### Likely UI bugs
- **`StreakBadge` label says "weeks" but the data is days.** Documented in [leaderboard.md](./dashboard/leaderboard.md). Cosmetic, but it weakens the daily-consistency message the page is trying to send.
- **Support form character limit mismatch.** Textarea allows 2000 chars, validator rejects >1000. Effective behaviour is the 1000 cap. See [support.md](./dashboard/support.md).
- **My Journey task detail Reward card.** The Points row appears to render `base_xp_reward` instead of `base_points_reward`. See [my-journey-task.md](./dashboard/my-journey-task.md).
- **Strikes tab on My Journey** is wired to static seed data, not an RPC. See [my-journey.md](./dashboard/my-journey.md).

### Naming inconsistencies
- **Products → Teams rename is partial.** UI headings say "Teams"; query keys, the `Product` type, the `team-journey.ts` file, the `CreateTeamDialog` button labelled "Add Product", and breadcrumbs still say "Products". See the team-journey docs.
- **Profile completeness check vs setup form.** `isProfileComplete` only checks `name`; `/profile/setup` enforces avatar. An avatar-less user with a name set could skip setup if they reach `/auth/invite`. See [auth-invite.md](./public/auth-invite.md).

### Architectural inconsistencies
- **Fetching pattern**: most authenticated pages use TanStack Query; the Account page uses local `useState` + `useEffect`. Could be normalised.
- **Admin client usage**: weekly-reports and audit-logs use the admin client (RLS bypass); peer-reviews uses the server client. Worth a consistency review.
- **Admin guard pattern**: 3 of 4 admin core pages, and 3 of 4 admin advanced pages, follow the same `useApp()` + redirect + `AdminSkeleton` pattern. `audit-logs` is the outlier (no client guard, relies entirely on middleware + RLS).
- **URL-synced tabs**: three admin pages reimplement the same `?tab=` syncing dance with `useSearchParams` + `useRouter.replace`. Strong candidate for a `useTabState` hook.
- **Two parallel invite routes**: `/invite` (legacy, defensive) and `/auth/invite` (newer, uses `waitForProfile`). A V2 split — at some point the legacy one can be retired.

### Design system observations
- All public auth pages share `bg-[#0000dd]` grid + `#ff78c8` pink accent + glassy zinc cards + Framer Motion entry animations. A coherent de-facto auth design system worth formalising.
- Brand pink `#ff78c8` recurs across authenticated pages (account, transaction-history) as the primary-action accent without being declared as a Tailwind/ShadCN token.
- Admin tables share a recurring pattern: `SortableHeader` with three-state arrow icons, `tabular-nums` numeric columns, skeleton rows, row-click detail modal. Ripe for a shared `<AdminTable>` primitive.
