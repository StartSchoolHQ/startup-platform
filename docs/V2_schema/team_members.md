# `team_members`

Junction table linking users to teams. A user can be **active** in only one team at a time. Historical memberships are preserved as separate rows (a user can leave and rejoin the same team — that's two rows, the old one with `left_at` set).

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `team_id` | uuid | NO | — | FK → `teams(id)` ON DELETE CASCADE |
| `user_id` | uuid | NO | — | FK → `users.data(id)` ON DELETE CASCADE |
| `team_role` | enum `team_role` | NO | `'member'` | `founder`, `member` |
| `joined_at` | timestamptz | NO | `now()` | |
| `left_at` | timestamptz | YES | — | NULL = active member |
| `left_reason` | enum `team_leave_reason` | YES | — | only set when `left_at IS NOT NULL`. Values: `voluntary`, `kicked`, `team_archived` |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `team_role` | `founder`, `member` |
| `team_leave_reason` | `voluntary`, `kicked`, `team_archived` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `team_id` → `teams(id)` ON DELETE CASCADE |
| FOREIGN KEY | `user_id` → `users.data(id)` ON DELETE CASCADE |
| UNIQUE (partial) | `(user_id) WHERE left_at IS NULL` — user can be active in only ONE team at a time across all teams |
| UNIQUE (partial) | `(team_id, user_id) WHERE left_at IS NULL` — defensive; prevents duplicate active rows for same `(team, user)` |
| CHECK | `(left_at IS NOT NULL) = (left_reason IS NOT NULL)` |
| CHECK | `left_at IS NULL OR left_at >= joined_at` |
| ENFORCED via trigger | `team_role = 'founder'` is only allowed when the matching `teams.founder_id = user_id` for that team |
| ENFORCED via trigger | the founder of a team cannot leave while the team is `active` — must transfer founder role or archive the team first |

## Indexes

| Index | Purpose |
|---|---|
| `(user_id) WHERE left_at IS NULL` | "what team is this user currently in?" — primary read for `users.data` page |
| `(team_id) WHERE left_at IS NULL` | "active members of team X" — used everywhere from rewards fan-out to UI |
| `(team_id, joined_at DESC)` | full team membership history including past members |
| `(user_id, joined_at DESC)` | a user's team history |

## Rules

- **One active team per user.** Enforced by the partial UNIQUE on `(user_id) WHERE left_at IS NULL`. If a user wants to join a new team, their current row must first be marked `left_at`.
- **Rejoining a team** is allowed. It creates a NEW row — the old row stays as history with its own `joined_at` / `left_at` window.
- **Founder role** is tied to `teams.founder_id`. Promoting a different member to founder requires:
  1. Update `teams.founder_id` to the new user
  2. Update the corresponding `team_members.team_role` to `founder`
  3. Demote the previous founder's row to `team_role = 'member'`
- **Leaving:**
  - `voluntary` — user initiates
  - `kicked` — founder/admin removes the member
  - `team_archived` — set automatically for all active members when `teams.status` flips to `archived`
- **Active member checks** for fan-out (rewards, milestones, notifications) always filter `WHERE left_at IS NULL`. Members who leave between the action and approval do not get retroactive rewards; this is by design (see `team_task_progress.md` and `team_milestone_unlocks.md`).
- A user's `team_exp` / `team_points` cache on `user_balances` does NOT reset when they leave — they keep what they earned. They simply stop earning until they join another team.

## RLS

| Operation | Policy |
|---|---|
| SELECT | all authenticated users can read active members of any team (for discovery / leaderboard); historical rows visible to admins and to the user themselves |
| INSERT | only via SECURITY DEFINER RPCs (`accept_invitation`, `create_team`); never direct |
| UPDATE | only via SECURITY DEFINER RPCs (`leave_team`, `kick_member`, `transfer_team_founder`) |
| DELETE | not exposed — use `left_at` |

## What's intentionally NOT here

| Concern | Lives in |
|---|---|
| Joining flow | `team_invitations` |
| Strike / penalty history | `team_strikes` |
| Per-member XP / points earned in this team | derive from `transactions WHERE user_id = X AND team_id = Y` |
