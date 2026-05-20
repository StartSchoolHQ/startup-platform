# User Management — `/dashboard/admin/users`

> The single place to find any human on the platform — current users, pending invites, and the (forthcoming) roles & permissions controls.

## Purpose

This page exists so an admin never has to ask "is this person on the platform yet, and what's their state?" without a definitive answer. It consolidates the full user roster, the invitation pipeline (manual, CSV, pending), and role administration into one tabbed surface.

Admins land here when onboarding a new cohort, debugging a "I can't log in" support ticket, checking who has not signed in for a while, or auditing who currently holds admin privileges.

## What it does

- **All Users tab** — paginated table (50 per page) of every user with: name, email, status (Active / Pending / Archived), role (Admin badge or User), total XP, total points, joined date (relative), last login (relative; amber when > 14 days).
- **Search** by name or email and **filter** by All Users / Active / Pending / Admins. Both reset pagination to page 1.
- **Sortable columns:** Name, XP, Points, Joined, Last Login. Click toggles asc/desc.
- Each row opens a **User Detail Modal** with the user's profile, XP/points, status, sign-in history, and team membership.
- **Bulk Invitations tab** — three nested tabs:
  - **Manual Invite** — single-user invite form (email, name fields).
  - **CSV Upload** — bulk uploader expecting `email, first_name, last_name` columns.
  - **Pending Invites** — table of unaccepted invitations with resend.
- **Roles & Permissions tab** — placeholder for upcoming role management.
- The **active tab is URL-synced** via `?tab=...` so deep links and browser back/forward work correctly.

## How it looks

Page header "User Management" sits above a top-level tab strip (All Users / Bulk Invitations / Roles & Permissions). The All Users tab is a Card containing a search-and-filter row (search input with magnifier icon left-aligned, role/status select on the right), then the data table inside a bordered container, then a "Showing X of Y users" footer with Previous/Next pagination.

Distinctive UI: the "Last Login" cell uses an amber tint when the user has been inactive 14+ days — a subtle nudge toward who needs re-engagement. Admins get a destructive-variant red badge to keep elevated accounts visually obvious in a long list. Status uses three badge variants (default / secondary / outline) so Active/Pending/Archived are all distinct at a glance. The Bulk Invitations tab has its own nested tab strip — invite intent (one vs many vs follow-up) lives where invites live, not in a separate menu.

## Thought behind it

Admin productivity for cohort onboarding is the dominant use case, so invitations get equal billing with the user list — a deliberate choice over hiding invites in a sub-menu. The nested tabs inside Bulk Invitations exist because operators do those three things in different mental modes: a one-off invite, a bulk import, and a "did they accept yet?" follow-up are different jobs.

Pagination is server-side at 50 rows; the table is intentionally **not** infinite-scroll because admins frequently need to share specific URLs or come back to the same view, and a deterministic page-and-filter URL is more useful than a scroll position.

The page does **not** expose destructive operations like "delete user" or "revoke session" inline. Those are intentionally off this page — bulk destructive actions on a list are how mistakes happen at scale. Drilling into the User Detail Modal is the gateway to per-user actions.

What is deliberately deferred: roles & permissions management is shown as "coming soon" rather than building a half-baked version, because mis-granted admin rights are a security incident.

## Wired-up bits

- **Page file:** [`src/app/dashboard/admin/users/page.tsx`](../../../src/app/dashboard/admin/users/page.tsx)
- **Key components:**
  - [`src/components/admin/admin-users-table.tsx`](../../../src/components/admin/admin-users-table.tsx) — paginated, searchable, sortable user table
  - [`src/components/admin/user-detail-modal.tsx`](../../../src/components/admin/user-detail-modal.tsx) — per-user drill-down
  - [`src/components/admin/bulk-invite-tab.tsx`](../../../src/components/admin/bulk-invite-tab.tsx) — nested invite tabs
  - [`src/components/admin/manual-invite-form.tsx`](../../../src/components/admin/manual-invite-form.tsx)
  - [`src/components/admin/csv-invite-uploader.tsx`](../../../src/components/admin/csv-invite-uploader.tsx)
  - [`src/components/admin/pending-invitations-table.tsx`](../../../src/components/admin/pending-invitations-table.tsx)
- **Hooks:** `useApp()` for the admin role check; `useSearchParams` / `useRouter` for the URL-synced tab state.
- **RPCs / API routes:**
  - `GET /api/admin/users?page&limit&search&filter` ([`src/app/api/admin/users/route.ts`](../../../src/app/api/admin/users/route.ts)) — joins `users` rows with `auth.admin.listUsers()` to surface confirmation status.
  - `POST /api/admin/bulk-invite` ([`src/app/api/admin/bulk-invite/route.ts`](../../../src/app/api/admin/bulk-invite/route.ts))
  - `POST /api/admin/resend-invite` ([`src/app/api/admin/resend-invite/route.ts`](../../../src/app/api/admin/resend-invite/route.ts))
  - `GET /api/admin/pending-invites` ([`src/app/api/admin/pending-invites/route.ts`](../../../src/app/api/admin/pending-invites/route.ts))
- **Auth requirement:** admin only. Non-admins redirected to `/dashboard`; every API route also re-checks `primary_role === "admin"`.
- **Notable types or schemas:** `User` and `SortKey` defined inline in `admin-users-table.tsx`. Invite payloads validated server-side via Zod schemas in [`src/lib/validation-schemas.ts`](../../../src/lib/validation-schemas.ts).
