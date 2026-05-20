# `team_invitations`

Invitations from a team founder/admin to a user to join a team. One row per invitation. Lifecycle: `pending` → `accepted` / `declined` / `expired` / `cancelled`. Acceptance auto-declines the user's other pending invites (one team per user rule).

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `team_id` | uuid | NO | — | FK → `teams(id)` ON DELETE CASCADE |
| `invited_user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE CASCADE |
| `invited_by_user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE SET NULL — who sent it |
| `proposed_role` | enum `team_role` | NO | `'member'` | role the user would join as |
| `status` | enum `invitation_status` | NO | `'pending'` | see enum |
| `message` | text | YES | — | optional personal note from inviter |
| `created_at` | timestamptz | NO | `now()` | |
| `expires_at` | timestamptz | NO | `now() + interval '7 days'` | auto-computed at insert |
| `responded_at` | timestamptz | YES | — | when status moved off `pending` |
| `responded_by_user_id` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL — who triggered the status change (invitee on accept/decline, inviter on cancel, system NULL on expire/auto-decline) |

## Enums

| Enum | Values |
|---|---|
| `invitation_status` | `pending`, `accepted`, `declined`, `auto_declined`, `expired`, `cancelled` |
| `team_role` | shared with `team_members`: `founder`, `member` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `team_id` → `teams(id)` ON DELETE CASCADE |
| FOREIGN KEY | `invited_user_id` → `users.data(id)` ON DELETE CASCADE |
| FOREIGN KEY | `invited_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| FOREIGN KEY | `responded_by_user_id` → `users.data(id)` ON DELETE SET NULL |
| UNIQUE (partial) | `(team_id, invited_user_id) WHERE status = 'pending'` — prevent duplicate pending invites for the same `(team, user)` |
| CHECK | `(status = 'pending') OR (responded_at IS NOT NULL)` — non-pending requires a `responded_at` |
| CHECK | `expires_at > created_at` |
| CHECK | `proposed_role <> 'founder'` — invitations cannot promote to founder; founder transfer is a separate flow |
| ENFORCED via trigger | `invited_user_id` cannot already be an active member of `team_id` |

## Indexes

| Index | Purpose |
|---|---|
| `(invited_user_id, status, created_at DESC)` | "show me my invites" — primary read |
| `(team_id, status, created_at DESC)` | "show invites I've sent for this team" |
| `(status, expires_at)` WHERE `status = 'pending'` | expiry sweep cron |
| `(invited_by_user_id, created_at DESC)` | inviter's send history |

## Rules

### Sending
- Sent by SECURITY DEFINER RPC `send_invitation` — checks the inviter has rights (team founder or admin), the invitee isn't already in the target team, and no duplicate `pending` row exists.
- `expires_at = created_at + 7 days`. The 7-day window is enforced at the DB default; future config can override per call.
- Inserts a `notification` row of type `invitation_received` to `invited_user_id`, with `actor_user_id = invited_by_user_id` and `source_table = 'team_invitations'`.

### Accepting
SECURITY DEFINER RPC `accept_invitation` runs in a single transaction:
1. Validate `status = 'pending'` and `expires_at > now()`.
2. Set this row: `status = 'accepted'`, `responded_at = now()`, `responded_by_user_id = invited_user_id`.
3. **Auto-decline** all other `pending` invitations for this `invited_user_id`: set `status = 'auto_declined'`, `responded_at = now()`, `responded_by_user_id = NULL`.
4. INSERT `team_members` row (one-team-per-user partial UNIQUE prevents duplicates).
5. Notifications:
   - Inviter of accepted invite → `invitation_accepted`
   - Inviters of auto-declined invites → `invitation_declined` with `metadata.auto = true`
   - Invitee → no notification (they took the action)

### Declining
- Invitee declines → `status = 'declined'`, `responded_at`, `responded_by_user_id = invited_user_id`.
- Inviter notified → `invitation_declined`.

### Cancelling
- Inviter cancels their own outgoing pending invite → `status = 'cancelled'`, `responded_by_user_id = invited_by_user_id`.
- Invitee notified → `invitation_expired` (or a `invitation_cancelled` type if you'd rather distinguish; current schema collapses to expired-style).

### Expiring
- Cron job sweeps `WHERE status = 'pending' AND expires_at <= now()` and flips them to `expired`. `responded_by_user_id` stays NULL (system action).
- Inviter and invitee both notified → `invitation_expired`.

## Notification mapping

| Lifecycle event | Recipient | `notification_type` |
|---|---|---|
| Invitation sent | invitee | `invitation_received` |
| Accepted (this invite) | inviter | `invitation_accepted` |
| Declined (by invitee) | inviter | `invitation_declined` |
| Auto-declined (after invitee accepted another) | inviter | `invitation_declined` (`metadata.auto = true`) |
| Cancelled (by inviter) | invitee | `invitation_expired` |
| Expired (timed out) | inviter and invitee | `invitation_expired` |

## RLS

| Operation | Policy |
|---|---|
| SELECT | invitee can see their own invites; inviter can see invites they sent; admins see all |
| INSERT | only via SECURITY DEFINER `send_invitation` RPC |
| UPDATE | only via SECURITY DEFINER RPCs (`accept_invitation`, `decline_invitation`, `cancel_invitation`, expiry cron) |
| DELETE | not exposed — full history preserved |

## What's intentionally NOT here

| Concern | Lives in |
|---|---|
| Membership state after acceptance | `team_members` (new row created) |
| Auto-decline detail per row | covered by `status = 'auto_declined'` and `metadata.auto = true` on the resulting notifications |
| Recurring / re-invite logic | a new row each time. The partial UNIQUE only blocks duplicate `pending` rows; non-pending rows allow re-invitation later. |
