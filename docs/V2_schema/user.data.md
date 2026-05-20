# `users.data`

Identity / profile row. Mirrors `auth.users` 1:1. Holds only stable identity fields: name, avatar, role, status, cohort, phase. **No XP/points cache** — those live in [user_balances](user_balances.md) so the reward write path doesn't dirty the identity row.

Activity counters (peer reviews done, weekly reports submitted/missed, tasks completed, current peer-review assignments) are NEVER stored here — they're derived from their source tables on demand.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | — | PK. FK → `auth.users(id)` ON DELETE CASCADE |
| `name` | text | NO | — | full name |
| `avatar_url` | text | YES | — | |
| `primary_role` | enum `primary_role_type` | NO | `'user'` | `user`, `admin` |
| `status` | enum `user_status` | NO | `'active'` | `active`, `disabled` |
| `phase` | enum `user_phase` | NO | `'individual'` | program phase — `individual`, `awaiting_team`, `team`, `graduated` |
| `cohort_id` | uuid | YES | — | FK → `cohorts(id)` ON DELETE RESTRICT — required for `primary_role = 'user'`, NULL for admins |
| `invited_by` | uuid | YES | — | FK → `users.data(id)` ON DELETE SET NULL |
| `absence_quota` | int | NO | `3` | config (limit), not a counter |
| `last_active_at` | timestamptz | NO | `now()` | last time the user did any authenticated action; updated by `record_user_active` RPC, debounced to once per 60 minutes |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger |

## Enums

| Enum | Values |
|---|---|
| `primary_role_type` | `user`, `admin` |
| `user_status` | `active`, `disabled` |
| `user_phase` | `individual`, `awaiting_team`, `team`, `graduated` |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `id` |
| FOREIGN KEY | `id` → `auth.users(id)` ON DELETE CASCADE |
| FOREIGN KEY | `cohort_id` → `cohorts(id)` ON DELETE RESTRICT |
| FOREIGN KEY | `invited_by` → `users.data(id)` ON DELETE SET NULL |
| CHECK | `primary_role = 'admin' OR cohort_id IS NOT NULL` — non-admin users must belong to a cohort |
| CHECK | `length(name) BETWEEN 1 AND 100 AND name = trim(name)` — prevents zero-width / RTL-override / unbounded-string attacks visible via `users_safe` |
| CHECK | `avatar_url IS NULL OR length(avatar_url) <= 1024` |
| CHECK | `absence_quota >= 0` |

## Indexes

| Index | Purpose |
|---|---|
| `(cohort_id, phase)` | "show me all users in cohort X currently in team phase" — primary admin/leaderboard query |
| `(phase)` | "all users awaiting team formation" |
| `(primary_role)` | admin listing |

**Leaderboard indexes are NOT here.** They live on [user_balances](user_balances.md) — see that file for `(cohort_id, individual_exp DESC)` etc.

## Rules

- **Invite-only signup.** No public route creates a `users.data` row. The only path is the SECURITY DEFINER `accept_invitation` RPC, which atomically:
  1. Creates the `auth.users` entry (or matches an existing pre-created one)
  2. INSERTs the `users.data` row
  3. INSERTs the paired `user_balances` row (cache zeroed)
  4. Sets `cohort_id` from the invitation's team
  5. INSERTs the `team_members` row + transitions `phase` to `team` (or stays `individual` for cohort-direct invites if added later)
  Pairing all three INSERTs in a single transaction means there is no signup race. The cache trigger's `INSERT … ON CONFLICT DO UPDATE` is defense in depth.
- `id` has **no default** — always equals `auth.users.id`. Created exclusively by `accept_invitation`.
- `email` is **not duplicated** here. Source of truth is `auth.users.email`.
- **No XP/points cache columns.** They live in [user_balances](user_balances.md) — separate hot-write path, separate indexing strategy.
- Activity counts (peer reviews done, weekly reports submitted/missed, tasks completed, current peer-review assignments) are **not stored here**. They are queried from their source tables on demand or via dedicated views.
- **`cohort_id` is set at signup or invitation acceptance** and is essentially immutable from the user's perspective. Admins can move a user between cohorts via `admin_set_user_cohort` SECURITY DEFINER RPC; that RPC also updates the denormalized `user_balances.cohort_id`.
- Admins (`primary_role = 'admin'`) do not belong to a cohort — they oversee all cohorts.
- **Admins are NOT created via any RPC.** Admin accounts are provisioned manually in Supabase Studio by the platform owner (raw `INSERT INTO public."users.data"` + `INSERT INTO public.user_balances`, then `UPDATE primary_role='admin'`). This is a deliberate constraint — no API surface for admin creation means no privilege escalation path. To promote an existing user, use raw SQL in Supabase Studio. The trade-off: admins are rare and the platform owner is the only person who creates them.
- **Direct UPDATE by users is locked down.** RLS allows self-UPDATE but column-level `tr_protect_columns` trigger blocks edits to `primary_role`, `cohort_id`, `phase`, `status`, `absence_quota`, and `invited_by`. The recommended client write path is the `update_my_profile(p_name, p_avatar_url)` RPC — see [rpcs.md](rpcs.md).

### Phase transitions

| From | To | Trigger |
|---|---|---|
| `individual` | `awaiting_team` | user completes individual journey (last `individual_journey` stage flips to `completed`) |
| `awaiting_team` | `team` | user accepts a team invitation (joins their first team in this cohort) |
| `team` | `graduated` | user completes team journey (last `team_journey` stage for their team flips to `completed`) |
| any | `team` (back) | user joins another team after a gap (rare; admin-driven) |

Phase changes are handled by SECURITY DEFINER triggers on the relevant journey/membership tables. App code never writes `phase` directly.

## Derived (NOT columns on this table)

| Concern | Source |
|---|---|
| XP / points totals (per context) | [user_balances](user_balances.md) |
| Peer reviews done — count + history | `transactions` (type = `peer_review_completed`) + `team_task_reviews` |
| Currently assigned peer reviews | `team_task_reviews` WHERE `reviewer_user_id = $1 AND status = 'pending'` |
| Weekly reports submitted / missed | `weekly_reports.status` |
| Tasks completed (individual / team) | `individual_task_progress` / `team_task_progress` (status = approved/completed) |
| Current journey stage | `individual_journey` / `team_journey` (status = `current`) |
| Absences taken | `absences` table |
| Current team membership | `team_members` WHERE `user_id = $1 AND left_at IS NULL` |

## On `last_active_at`

`auth.users.last_sign_in_at` updates only on actual sign-in events; long-lived sessions never refresh it. We need a real "last active" signal for engagement / churn metrics, so:

- Every authenticated request middleware calls `record_user_active()` ([rpcs.md](rpcs.md))
- The RPC is **debounced**: it only writes if the existing value is older than 60 minutes
- Result: at most 24 writes per user per day, regardless of request volume
- Visible to admins; **not** exposed via `users_safe` to peers (engagement metric, not social)

Useful queries this enables:
- "Users active in last 7 / 30 days"
- "Cohort engagement: % of cohort active this week"
- "Churn risk: no activity in 14+ days"
- "Currently online" (last 5 minutes)
