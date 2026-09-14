# Users — `/dashboard/admin/users`

> The full user roster with search, batch and status filters. Accounts are created by Google sign-in, so there is no invitation pipeline here any more.

## Purpose

Answer "is this person on the platform, and in what state?" A new student appears in this list right after their first Google sign-in with an `@startschool.org` account; nothing has to be done in advance. The old Invitations tab (manual invite, CSV upload, pending invites) was removed on 2026-09-14 with the Google SSO cutover — see `docs/GoogleSSO/`.

## What it does

- One card, "All users": search input, batch / status filters, sortable table (name, email, role, batch, status, last login), pagination footer "Showing X of Y users".
- A one-line hint above the card explains that new students sign in with Google and need no invitation.
- Row actions open the user profile; archived users from closed batches are hidden by default.

## How it looks

Page header "Users", the hint line in muted text, then the table card. "Last Login" uses an amber tint after 14 days of inactivity; admins carry a red destructive badge; Active / Pending / Archived use three distinct badge variants.

## Thought behind it

With the account gate in the database (`hook_restrict_signup`), admin onboarding work disappears — the roster is the only thing left to look at. Keeping a tab strip for one tab would be noise, so the page is a single card. A stale `?tab=invitations` bookmark simply shows the users list.

## Wired-up bits

- **Files:** `src/app/dashboard/admin/users/page.tsx`, `src/components/admin/admin-users-table.tsx`
- **Deprecated, still on disk until Phase 2:** `src/components/admin/bulk-invite-tab.tsx`, `manual-invite-form.tsx`, `csv-invite-uploader.tsx`, `pending-invitations-table.tsx`, `POST /api/admin/bulk-invite`, `POST /api/admin/resend-invite`, `GET /api/admin/pending-invites`
- **Related:** `docs/documentation/invitations.md` (team invitations still live there), `docs/GoogleSSO/2026-08-27-google-sso-invite-gate-design.md`
