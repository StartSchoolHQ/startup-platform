# Team Invitations — `/dashboard/invitations`

> The inbox/outbox for joining teams. Accept or decline invites you've received, monitor the status of invites you've sent.

## Purpose
Teams in StartSchool form by invitation, not open join. Founders need a single place to:

- See who has invited them where, and respond.
- Track invites they've sent to teammates and whether those have been answered.

It's used by every authenticated member. The most common moments to visit are: right after someone tells you "I just invited you", when the global notification badge shows a pending count, and after sending invites yourself to check whether the recipient acted.

## What it does
- Loads two parallel React Query datasets keyed by `user.id`: `getPendingInvitations(userId)` (received, status `pending`) and `getSentInvitations(userId)` (everything the current user has sent, regardless of status).
- Splits them into two tabs: **Received** (default) with an `Inbox` icon and a count badge, **Sent** with a `Send` icon and a count badge.
- **Received tab** renders one card per invitation showing: inviter's avatar + name, the team name in bold, the offered role as a `secondary` badge (with underscores replaced by spaces), team `member_count` as an `outline` badge, the formatted creation date, and two action buttons: `Decline` (outline) and `Accept` (pink solid `bg-[#ff78c8]`).
- **Sent tab** renders one card per outgoing invitation showing: invitee avatar + name, target team, role badge, status badge whose colour reflects the response (`accepted` → default, `declined` → destructive, `pending` → outline), and creation date. No actions — sent invites are read-only here.
- `respondMutation` calls `respondToInvitation(invitationId, userId, response)` where `response` is `"accepted" | "declined"`. On success it:
  - Fires `invitation_accepted` or `invitation_declined` to PostHog with team metadata.
  - Toasts a success message ("Invitation accepted! You are now a team member." or "Invitation declined.").
  - Invalidates the `["invitations"]` query keys, the global invitation count badge (`invalidateInvitationCount`), and any cached lists (`invalidateInvitationLists`).
- Errors surface as `toast.error` with the underlying error message.
- Both action buttons disable while `respondMutation.isPending` to prevent double-submits.
- Empty states for both tabs render a centred icon, headline, and helper text inside a `Card`.
- Initial loading state replaces the entire page with a skeleton: header skeleton, tab skeleton, three placeholder invitation rows.
- Cards stagger in via `framer-motion` with `delay: index * 0.05` for a subtle cascade.

## How it looks
Page header `Team Invitations` with the subtitle `Manage your team invitations and membership requests`.

Below it, a `Tabs` strip with a `w-fit` two-column grid: `Received (N)` and `Sent (N)` — counts are live from the queried lists.

Each tab body is a vertical stack of `Card`s. Cards are 4-column flex rows: avatar (40×40, fallback shows initials), a flexible middle block (line 1: bold sentence describing the action, line 2: badge cluster + date), and a right-side action group (Received only).

Action buttons on Received cards are deliberately asymmetric — Decline is a low-emphasis outline button, Accept is a saturated pink (`#ff78c8`) that's the only call-to-action that colour on the page. Cards have generous vertical padding (`py-4`) and consistent `gap-4` between sections.

The empty state in each tab swaps the card list for a single tall `Card` with a centred 12×12 icon, a heading, and a paragraph of guidance.

## Thought behind it
This page is small, but it's the **first social handshake** in the product. A new founder either lands here because someone invited them in, or sends an invite from here to bring a co-founder along. Both moments matter for activation, so the page is built to remove friction and ambiguity, not to dazzle.

A few choices reveal the intent:

**Received is the default tab.** When you arrive, the most likely reason is "respond to something". Sent is a secondary, mostly informational view. Defaulting to Received reduces the most common path to one click.

**Inviter's avatar and name lead each card.** Team invitations on most platforms list the team first. Here the inviter is on the left because in early-stage startup-land, *who* invited you matters more than *which* team — you join people, not org charts.

**Pink Accept button.** It's the only place on the dashboard that uses that specific pink as a primary action colour. It's a deliberate "this is friendly, not corporate" signal — accepting a teammate isn't an enterprise approval flow.

**Sent invites have no resend / no cancel.** That's a real product gap, but it's also a mild forcing function: once you invite someone, you wait. No nagging, no UI to undo it, no temptation to spam. Status badges (pending / accepted / declined) tell you what happened without giving you a button to do anything about it.

**No bulk operations, no filters, no search.** The page assumes invitation volume per user is small (single digits). When it stops being small, this is a surface that will need to evolve — but premature complexity here would have hurt the early experience.

The role badge (`role.replace("_", " ")`) is a quiet hint that team roles can be granular without making the user think about it: the system supports the concept, the UI flattens it.

## Wired-up bits
- **Page file:** [`src/app/dashboard/invitations/page.tsx`](../../../src/app/dashboard/invitations/page.tsx)
- **Key components:** ShadCN primitives only (`Card`, `Tabs`, `Avatar`, `Badge`, `Button`, `Skeleton`); no feature-specific components.
- **Hooks:**
  - [`src/contexts/app-context.tsx`](../../../src/contexts/app-context.tsx) — `useAppContext()` for current user
  - [`src/hooks/use-invitation-count.ts`](../../../src/hooks/use-invitation-count.ts) — exports `invalidateInvitationCount` and `invalidateInvitationLists` used in mutation `onSuccess`
  - `useQuery` / `useMutation` / `useQueryClient` from `@tanstack/react-query`
- **Data layer:** [`src/lib/database.ts`](../../../src/lib/database.ts) re-exports `getPendingInvitations`, `getSentInvitations`, `respondToInvitation`
- **RPCs / API routes:** No direct RPC call from the page. The data-layer functions wrap `team_invitations` table operations (with joins to `teams` and `users` for inviter / invitee profiles); response writes flow through `respondToInvitation` which updates `team_invitations.status` and triggers downstream team-membership effects.
- **Auth requirement:** Authenticated. Both queries are gated by `enabled: !!user?.id`.
- **Notable types or schemas:** Local `Invitation` interface in the page file (annotated `eslint-disable` and unused — types come from the data-layer return shape). Mutation variables: `{ invitationId: string; response: "accepted" | "declined"; teamId?: string; teamName?: string }`.
