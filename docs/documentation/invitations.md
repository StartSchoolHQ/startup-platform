# Invitations System

> Team invitations: existing users inviting each other to join teams. Users can only be part of one team at a time — accepting an invitation auto-declines all others. Account creation is Google sign-in only (see History below).

## Overview

1. **Account creation (Google SSO, since 2026-09-14)** — there is no admin invitation any more. A person signs in with their `@startschool.org` Google account; Supabase creates the auth user, the `before_user_created` hook (`public.hook_restrict_signup`) rejects anything that is not Google + `@startschool.org`, the `on_auth_user_created` trigger (`handle_new_auth_user` v2) creates the `public.users` row with the Google name and the single open batch, and `/auth/callback` sends them to `/profile/setup` (name + avatar) before the dashboard. Existing accounts (including gmail ones) link their Google identity automatically on first Google sign-in. Spec: `docs/internal/GoogleSSO/`. The legacy email-invite routes were removed on 2026-09-15 (see History).
2. **Team Invitations** — Team members invite existing platform users to join their team. Stored in `team_invitations` table. Users accept/decline from `/dashboard/invitations`.

**Key constraint:** Users can only belong to ONE team at a time. Accepting a team invitation auto-declines all other pending invitations.

---

## Database Schema

### `team_invitations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `team_id` | UUID | FK → `teams.id` |
| `invited_user_id` | UUID | FK → `users.id` — recipient |
| `invited_by_user_id` | UUID | FK → `users.id` — sender |
| `role` | `team_role_type` | Offered role: `"member"`, `"leader"`, `"co_founder"` (nullable) |
| `status` | TEXT | `"pending"`, `"accepted"`, `"declined"` (nullable) |
| `created_at` | TIMESTAMP | When invitation was sent |
| `responded_at` | TIMESTAMP | When user accepted/declined (nullable) |

---

## Team Invitation Flow

### Sending Invitations

**Who can send:** Team `founder`, `co_founder`, or `leader` roles.

**From Team Management Modal:**

1. Open team management → "Add Members" tab
2. Search available users (RPC: `get_available_users_for_invitation`)
3. Click invite → `sendTeamInvitationById(teamId, userId, "member")`
4. PostHog event: `"invitation_sent"`
5. Toast: "Invitation sent to {name} successfully!"

**Validation before sending:**
- User must exist
- User must NOT be in any active team (`team_members.left_at IS NULL`)
- User must NOT already be in this team
- No pending invitation already exists for this user+team

**By email:** `sendTeamInvitation(teamId, email, inviterUserId, role?)` — looks up user by email first.

### Invitation Lifecycle

```
Team member sends invitation
  → status: "pending"
    → Notification created (type: "invitation")
      → Recipient sees in /dashboard/invitations
        → Accept:
          │ → INSERT into team_members (left_at NULL)
          │ → DB trigger: auto-decline all other pending invitations
          │ → increment_team_member_count RPC
          │ → Notification: "invitation_accepted" to sender
          │ → Notification: "invitations_auto_declined" to user (if others existed)
          └ → status: "accepted", responded_at set
        → Decline:
          │ → Notification: "invitation_declined" to sender
          └ → status: "declined", responded_at set
```

### Accept Flow Detail

**Function:** `respondToInvitation(invitationId, userId, "accepted")`

1. Fetch invitation (must be `status = "pending"`)
2. Check user has NO active team membership
3. INSERT into `team_members` with role from invitation
4. **DB trigger fires:** auto-decline all other pending invitations for user
5. UPDATE invitation: `status = "accepted"`, `responded_at = now()`
6. Call `increment_team_member_count(team_id)` RPC

**Error cases:**
- "Invitation not found or already responded to"
- "Cannot accept invitation: You are already a member of '{teamName}'"
- "Failed to add you to the team"

### Decline Flow Detail

**Function:** `respondToInvitation(invitationId, userId, "declined")`

1. Fetch invitation
2. UPDATE: `status = "declined"`, `responded_at = now()`

---

## Auto-Decline Logic

**Trigger:** Database trigger on `team_members` INSERT.

**When user accepts any invitation:**
1. User added to `team_members` (with `left_at IS NULL`)
2. DB trigger finds ALL other pending invitations for that user
3. Sets each to `status = "declined"`, `responded_at = now()`
4. Creates `invitations_auto_declined` notification:
   - Title: "{count} invitation(s) automatically declined"
   - Data: `{ count, teamNames, joinedTeamId }`

**Rationale:** One-team-at-a-time rule. Application code doesn't explicitly decline — the database handles it.

---

## History: admin email invites (removed 2026-09-15)

Until the Google SSO cutover, admins onboarded students by email: `POST /api/admin/bulk-invite` called `auth.admin.inviteUserByEmail`, `GET /api/admin/pending-invites` listed unconfirmed users, `POST /api/admin/resend-invite` re-sent the magic link, and `/invite` + `/auth/invite` (plus a hash handler on `/`) turned the link into a session. The admin Invitations tab was removed from the UI on 2026-09-14 and the routes, components and the `BulkInviteSchema` / `ResendInviteSchema` Zod schemas were deleted on 2026-09-15 (Google SSO Phase 2). The auth audit log showed zero `user_invited` events after the cutover. Accounts are now created only by Google sign-in — see `docs/internal/GoogleSSO/`.

---

## Invitations Page

**Route:** `/dashboard/invitations`
**File:** `src/app/dashboard/invitations/page.tsx`

### Received Tab (Pending)

**Data:** `getPendingInvitations(user.id)` via React Query

**Per invitation:**
- Inviter avatar + name
- Text: "{Inviter} invited you to {TeamName}"
- Badges: Role, member count, date
- Buttons: "Decline" (outline) / "Accept" (pink)
- Staggered fade-in animation

**Empty state:** "No pending invitations" with Inbox icon

### Sent Tab

**Data:** `getSentInvitations(user.id)` via React Query

**Per invitation:**
- Invitee avatar + name
- Text: "Invited {User} to {TeamName}"
- Badges: Role, status (pending/accepted/declined), date
- Read-only (no action buttons)

**Empty state:** "No sent invitations" with Send icon

---

## Hooks

### `useInvitationCount(userId)`

**File:** `src/hooks/use-invitation-count.ts`

| Config | Value |
|--------|-------|
| Query key | `["invitations", "count", userId]` |
| Stale time | 30 seconds |
| Refetch on focus | Enabled |
| Refetch interval | 60 seconds |

**Returns:** `{ count: number, refreshCount: () => void }`

**Used in:** Sidebar badge showing pending invitation count (red destructive badge).

### Cache Invalidation Helpers

- `invalidateInvitationCount(queryClient, userId?)` — refreshes count
- `invalidateInvitationLists(queryClient)` — refreshes pending + sent lists

---

## React Query Configuration

```typescript
// Pending invitations
queryKey: ["invitations", "pending", user?.id]

// Sent invitations
queryKey: ["invitations", "sent", user?.id]

// Respond mutation
useMutation({
  mutationFn: (vars) => respondToInvitation(vars.invitationId, userId, vars.response),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["invitations"] });
    invalidateInvitationCount(queryClient, user?.id);
    // PostHog tracking, toast
  },
});
```

---

## Notifications

| Type | Trigger | Icon | Source |
|------|---------|------|--------|
| `invitation` | New team invitation created | `Users` | DB trigger |
| `invitation_accepted` | User accepts invitation | `UserCheck` | DB trigger |
| `invitation_declined` | User declines invitation | `UserX` | DB trigger |
| `invitations_auto_declined` | Pending invitations auto-declined on team join | `UsersX` | DB trigger |

All invitation notifications route to `/dashboard/invitations` on click.

---

## Data Functions

**File:** `src/lib/data/invitations.ts`

| Function | Purpose |
|----------|---------|
| `sendTeamInvitation(teamId, email, inviterUserId, role?)` | Send invite by email lookup |
| `sendTeamInvitationById(teamId, userId, role?)` | Send invite by user ID |
| `getPendingInvitations(userId)` | Received pending invitations with team + inviter data |
| `getSentInvitations(userId)` | Sent invitations with invitee data (all statuses) |
| `respondToInvitation(invitationId, userId, response)` | Accept or decline |
| `getInvitationCount(userId)` | Count of pending invitations |
| `getAvailableUsersForInvitation(teamId, searchTerm?)` | Users not in any team, via RPC |
| `getInvitationAvailabilityStats()` | Platform-wide stats (total, in teams, available) |

---

## RPC Functions

| Function | Purpose |
|----------|---------|
| `get_available_users_for_invitation(p_team_id, p_search_term)` | Filter users not in teams, not pending invite |
| `increment_team_member_count(team_id)` | Increment `teams.member_count` on accept |
| `decrement_team_member_count(team_id)` | Decrement on team leave |

---

## Validation Schemas

**File:** `src/lib/validation-schemas.ts`

| Schema | Fields |
|--------|--------|
| — | No invitation schemas remain; team invitations are sent by user id via `sendTeamInvitationById` |

---

## Key Constraints & Gotchas

1. **One team per user** — Enforced by check before accept + auto-decline trigger
2. **Only one system** — team invitations (`team_invitations` table). Account creation is Google sign-in, not an invitation.
3. **Auto-decline is DB-level** — Application code doesn't explicitly decline others; Postgres trigger handles it
4. **Notification type constraint** — Must exist in `notifications_type_check` before inserting

---

## File Reference

| File | Purpose |
|------|---------|
| `src/app/dashboard/invitations/page.tsx` | Invitations page (Received/Sent tabs) |
| `src/lib/data/invitations.ts` | All invitation CRUD functions |
| `src/hooks/use-invitation-count.ts` | Sidebar badge hook + invalidation |
| `src/components/team-journey/team-management-modal.tsx` | Send invitations UI |
| `src/lib/validation-schemas.ts` | Zod schemas |
| `src/types/database.ts` | Auto-generated DB types |
