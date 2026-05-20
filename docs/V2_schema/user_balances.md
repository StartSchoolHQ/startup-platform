# `user_balances`

Cached XP / points totals per user, split into `(individual, team) × (exp, points)`. **Separate from `users.data`** so the high-write reward path doesn't dirty the identity row that hot-read paths (profile, dashboard header, cohort directory) depend on.

This is the single most-written row per active user. Isolating it from identity:
- Keeps `users.data` page cache hit rate high
- Lets us index leaderboards without contending with reward writes
- Gives us optionality to denormalize per-stage XP later without touching identity

The four columns are **caches** rebuilt from `transactions`. They MUST only be mutated by the SECURITY DEFINER award function chain (`award_transaction` and its trigger). Never updated directly from app code.

---

## Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `user_id` | uuid | NO | — | PK + FK → `users.data(id)` ON DELETE CASCADE |
| `individual_exp` | int | NO | `0` | cache: `SUM(transactions.xp_change WHERE user_id=X AND context='individual')` |
| `team_exp` | int | NO | `0` | cache: same with `context='team'` |
| `individual_points` | int | NO | `0` | same |
| `team_points` | int | NO | `0` | same |
| `cohort_id` | uuid | YES | — | denormalized snapshot of `users.data.cohort_id` for leaderboard index efficiency. Maintained by trigger when `users.data.cohort_id` changes (admin moves user). NULL for admins. |
| `updated_at` | timestamptz | NO | `now()` | maintained by trigger on every cache update |

## Constraints

| Type | Definition |
|---|---|
| PRIMARY KEY | `user_id` |
| FOREIGN KEY | `user_id` → `users.data(id)` ON DELETE CASCADE |
| FOREIGN KEY | `cohort_id` → `cohorts(id)` ON DELETE RESTRICT |

**No `>= 0` CHECKs.** A fresh user can legitimately drop below zero (e.g. weekly-report missed before any earnings). The ledger is the source of truth; the cache reflects it.

## Indexes

| Index | Purpose |
|---|---|
| `(cohort_id, individual_exp DESC) WHERE cohort_id IS NOT NULL` | individual leaderboard per cohort — covered, no sort |
| `(cohort_id, team_exp DESC) WHERE cohort_id IS NOT NULL` | team leaderboard per cohort |
| `(cohort_id, individual_points DESC) WHERE cohort_id IS NOT NULL` | points leaderboard per cohort |
| `(cohort_id, team_points DESC) WHERE cohort_id IS NOT NULL` | same |

## Rules

- **One row per user**, created by `tr_create_user_balances` paired with the `users.data` INSERT inside the `accept_invitation` SECURITY DEFINER. Neither row should exist without the other; pairing inside one DEFINER means there's no signup race.
- **Cache writes happen only via the `award_transaction` trigger chain.** The trigger uses `INSERT … ON CONFLICT (user_id) DO UPDATE SET …` (defense in depth — if a race somehow leaves a missing row, the upsert creates it instead of silently no-op-ing). The trigger also sets `SET LOCAL app.cache_update_in_progress = 'on'` so `tr_protect_user_balances` permits the write. **Admins do NOT bypass** — admin XP corrections go through `admin_grant` (which writes a `transactions` row → cache updates via the trigger), and cache drift fixes go through `audit_recompute_user_caches`. Direct admin UPDATE on `user_balances` always raises.
- **`cohort_id` denormalization** is maintained by a trigger on `users.data` UPDATE: when `cohort_id` changes (admin RPC only), update the matching `user_balances.cohort_id`. This avoids JOINing `users.data` on every leaderboard render.
- **Read-only to clients.** RLS allows SELECT same as `users.data` (own + same-cohort + admin), denies INSERT/UPDATE/DELETE entirely.
- **Reconciliation.** `audit_user_xp_drift` (see [invariants.md](invariants.md)) compares these four columns against `SUM(transactions.*_change)` per user per context. Any drift = a bug in the trigger chain.

## RLS

| Operation | Policy |
|---|---|
| SELECT | own row; same-cohort users (read leaderboard); admins all |
| INSERT | only via signup trigger / DEFINER (`tr_create_user_balances`) |
| UPDATE | only via the `award_transaction` trigger (which sets `app.cache_update_in_progress`) |
| DELETE | not exposed (CASCADE from `users.data` on user deletion only) |

## Why this is a separate table (not columns on `users.data`)

| Concern | Cache on `users.data` | Cache in `user_balances` |
|---|---|---|
| Hot-write isolation | Reward writes dirty the identity row, busting page cache for profile reads | Identity row stays cold; rewards hit a different page |
| Leaderboard indexing | Adding `(cohort_id, exp DESC)` to `users.data` makes that table heavier on every UPDATE | Indexes live on the small balances table only |
| Per-stage XP rollup later | Would require adding more cache columns to `users.data` | Future `user_balances_per_stage` mirror table joins cleanly |
| Multi-region read replica lag | Identity inconsistency is more visible to users than balance lag | Balance caches can lag a few seconds without UX impact |

## Cost

One extra row per user, one extra trigger jump per reward. Both negligible at any scale.

## Realtime broadcast (live leaderboard)

`user_balances` is **broadcast via Supabase Realtime** — UPDATEs to balance rows are pushed to subscribers for live leaderboards.

| Subscription pattern | Use case |
|---|---|
| `user_balances:cohort_id=eq.<my-cohort-id>` | Live leaderboard for the user's cohort |

The per-cohort filter keeps fan-out scoped. At 2000 users in a cohort with ~150 transactions/user/year, the cohort sees ~1 update per minute steady state, peaking ~30/min during cohort-wide task-approval bursts. Manageable on Supabase Pro.

App side: subscribe when leaderboard view mounts; tear down on unmount. The denormalized `cohort_id` on this table is what makes the per-cohort filter index-friendly server-side (no JOIN required to evaluate the filter).

## What's intentionally NOT here

| Concern | Where |
|---|---|
| Phase, role, cohort membership | `users.data` |
| Per-stage XP rollups | not modeled in V2 — derive from `transactions.stage_id` (see `transactions.md`); promote to a cached table later if dashboards need it |
| Per-team XP earned by member | derive: `SUM(transactions.xp_change WHERE user_id=X AND team_id=Y AND context='team')` |
