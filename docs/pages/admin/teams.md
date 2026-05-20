# Team Management — `/dashboard/admin/teams`

> The roster of every startup team on the platform plus the strike workflow for resolving rule-break penalties.

## Purpose

Teams are the unit of progress in the accelerator — they earn points, complete tasks, and submit weekly reports together. This page exists so an admin can compare teams side-by-side at a glance, drill into any team's full history, and process the strike queue (the disciplinary mechanism teams use when they need to explain a missed deliverable or rule infraction).

Admins visit when investigating a team's progress, when a strike has been explained and is waiting for a decision, or when running a weekly check on overall team output.

## What it does

- **All Teams tab** — sortable table of every team with: name, member count, total points, meetings count, tasks completed, status (Active / other), created date, and a Details action.
- **Sortable columns** on Team Name, Members, Points, Meetings, Tasks Done, Created. Default sort: Points descending, so the leaderboard view is the first thing an admin sees.
- Clicking **Details** opens a `TeamDetailsModal` with the team's full profile, member roster, and per-team metrics.
- **Team Strikes tab** — full strike review queue, filterable by status (Pending / Active / Resolved / Rejected / All; default Pending).
- Each strike row shows the team, the affected user (if any), strike type and title, who explained it and when, and exposes a **Review Strike Modal** where an admin can resolve (refund the penalty to all team members) or reject (with a rejection reason).
- Strike resolution surfaces a toast indicating whether a refund was triggered, and invalidates both the admin strikes query and the affected team's journey strikes query so all surfaces stay consistent.
- **Active tab is URL-synced** via `?tab=...`.

## How it looks

Page header "Team Management" with a two-tab strip below (All Teams / Team Strikes). The All Teams tab is a Card containing a single bordered table — no extra filters, because the dataset is small enough to scan and sortable headers are sufficient. Each header has a sort indicator (up arrow / down arrow / muted bidirectional arrow when inactive). The action column on the right has a `Eye` icon "Details" button per row.

The Strikes tab is a Card with a status filter Select at the top and a list/table of strikes below. The Review Strike Modal is the primary workflow — it is where the actual decision happens. Active strikes use destructive-leaning visuals; resolved/rejected ones are de-emphasized.

Distinctive choice: status uses a default badge for "active" and a secondary badge for everything else, keeping the admin's eye drawn to live teams. Counts use `tabular-nums` so columns of numbers line up cleanly.

## Thought behind it

The default sort is Points descending because the dominant question an admin asks of this list is "who is winning right now?" — a roster sort by name would make that question expensive. The list intentionally shows operational counts (meetings, tasks completed) rather than vanity metrics, because those are the leading indicators a team is actually doing the work.

Strikes get a dedicated tab rather than being a column on the team list because the strike workflow has its own status state machine (pending → active → resolved/rejected), and reviewing them is a focused job — admins do not want to context-switch between "scan the roster" and "make a quasi-judicial decision on one team's penalty".

The "resolve = refund" outcome is shown in the success toast specifically because it is a high-impact action: refunding penalty points to every member of a team has knock-on effects on leaderboards, and an admin needs immediate confirmation it happened.

What was deliberately left out of the team table: team-level CRUD (rename, archive, delete). Those are dangerous on a list and are gated behind the team detail modal or dedicated routes.

## Wired-up bits

- **Page file:** [`src/app/dashboard/admin/teams/page.tsx`](../../../src/app/dashboard/admin/teams/page.tsx)
- **Key components:**
  - [`src/components/admin/admin-teams-table.tsx`](../../../src/components/admin/admin-teams-table.tsx) — sortable team roster
  - [`src/components/admin/team-details-modal.tsx`](../../../src/components/admin/team-details-modal.tsx) — per-team drill-down
  - [`src/components/admin/admin-strikes-table.tsx`](../../../src/components/admin/admin-strikes-table.tsx) — strike queue with filters
  - [`src/components/admin/review-strike-modal.tsx`](../../../src/components/admin/review-strike-modal.tsx) — resolve / reject workflow
- **Hooks:** `useApp()` for role guard; `useSearchParams` / `useRouter` for tab state; `useQuery` / `useMutation` from TanStack Query inside the strikes table.
- **RPCs / API routes:**
  - `GET /api/admin/teams` ([`src/app/api/admin/teams/route.ts`](../../../src/app/api/admin/teams/route.ts))
  - `GET /api/admin/teams/[id]` ([`src/app/api/admin/teams/[id]/route.ts`](../../../src/app/api/admin/teams/[id]/route.ts)) for the detail modal
  - `POST /api/admin/resolve-strike` ([`src/app/api/admin/resolve-strike/route.ts`](../../../src/app/api/admin/resolve-strike/route.ts)) — handles both resolve and reject, returns `refundTriggered` and `team_id` for cache invalidation
  - `getAdminStrikes(filter)` and `rejectStrike()` from [`src/lib/database.ts`](../../../src/lib/database.ts)
- **Auth requirement:** admin only. Non-admins redirected to `/dashboard`; API routes re-check role and use the admin client for cross-team reads.
- **Notable types or schemas:** `Team` (inline in `admin-teams-table.tsx`), `AdminStrike` (inline in `admin-strikes-table.tsx`). Strike state values: `pending` | `active` | `resolved` | `rejected`.
