# `team_milestone_unlocks`

Per-team record of milestone unlocks in the team journey. One row when a team first crosses a milestone threshold. Each unlock fans out to one `transactions` row per currently-active team member (the row itself records the unlock, the transactions record the payouts).

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `team_id` | uuid | NO | — | FK → `teams(id)` ON DELETE CASCADE |
| `milestone_id` | uuid | NO | — | FK → `team_milestones(id)` ON DELETE RESTRICT |
| `members_paid_count` | int | NO | `0` | how many active members received payouts at unlock time |
| `unlocked_at` | timestamptz | NO | `now()` | |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `team_id` → `teams(id)` ON DELETE CASCADE |
| FOREIGN KEY | `milestone_id` → `team_milestones(id)` ON DELETE RESTRICT |
| UNIQUE | `(team_id, milestone_id)` — prevents double-paying |
| CHECK | `members_paid_count >= 0` |

## Indexes

| Index | Purpose |
|---|---|
| `(team_id, unlocked_at DESC)` | team milestone history |
| `(milestone_id)` | admin: "how many teams hit this milestone?" |

## Rules

- Inserted **once** per team per milestone, by the SECURITY DEFINER function called from the team-task approval trigger when `team_journey.progress_percent` first reaches a milestone's `threshold_percent`.
- The same function inserts one `transactions` row **per currently-active team member**, with:
  - `source_table = 'team_milestone_unlocks'`
  - `source_id = <this row's id>`
  - `context = 'team'`
  - `team_id = <this team>`
  - `xp_change = team_milestones.xp_reward_per_member`
  - `points_change = team_milestones.points_reward_per_member`
- `members_paid_count` is set at unlock time — useful for audit ("we paid 5 members") even if membership changes later.
- **Why no single `transaction_id` column:** the unlock is one event but produces N transactions. Reverse lookup is via `transactions.source_id = team_milestone_unlocks.id` (already indexed on transactions).
- Members who join the team after a milestone unlock do NOT get retroactive payouts.
- Members who left before unlock are not paid.
- `milestone_id` is RESTRICT — admins must deactivate, not delete, to preserve team history.

## Visual mapping

| UI element | Source |
|---|---|
| `2/4 milestones` for the team's current stage | `COUNT(team_milestone_unlocks)` for the stage / `COUNT(team_milestones WHERE is_active)` |
| Milestone toast / notification (per member) | each `transactions` INSERT triggers a `notifications` row (handled separately) |
