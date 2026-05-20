# Data Invariants

V2 promises certain truths must always hold. Some are enforced by constraints; others by triggers; a few are kept honest by audit jobs.

A green run of every query in this document means the database is in a healthy state. Any non-empty result is a bug — either schema, RPC, or operational.

---

## Categories of enforcement

| Mechanism | What it enforces | When it fires |
|---|---|---|
| `CHECK` constraint | Single-row predicates | every INSERT / UPDATE |
| `UNIQUE` (incl. partial) | Cross-row uniqueness | every INSERT / UPDATE |
| `FOREIGN KEY` | Referential integrity | every INSERT / UPDATE / DELETE |
| Trigger (BEFORE / AFTER) | Cross-row consistency, column-level write protection, fan-out | row write |
| SECURITY DEFINER RPC | Multi-row atomic operations, privilege checks | RPC call |
| Audit query (cron / on-demand) | Eventual-consistency invariants (e.g. cache reconciliation) | scheduled |

---

## The invariants

### 1. XP / points cache equals ledger sum

For every user and every `(context, currency)` combination, the cache on **`user_balances`** equals the SUM of `transactions` for that user/context.

**Statement:**
```
user_balances.individual_exp     = SUM(transactions.xp_change)     WHERE user_id = X AND context = 'individual'
user_balances.team_exp           = SUM(transactions.xp_change)     WHERE user_id = X AND context = 'team'
user_balances.individual_points  = SUM(transactions.points_change) WHERE user_id = X AND context = 'individual'
user_balances.team_points        = SUM(transactions.points_change) WHERE user_id = X AND context = 'team'
```

**Enforced by:**
- AFTER INSERT trigger on `transactions` → `tr_apply_transaction_to_balance` (sets `app.cache_update_in_progress` then **`INSERT … ON CONFLICT (user_id) DO UPDATE`** on `user_balances` — upsert defends against any signup race; missing balance row is created on first reward instead of silently lost)
- BEFORE UPDATE trigger on `user_balances` (`tr_protect_user_balances`) — only permits writes when the flag is set OR caller is service_role. **Admins do NOT bypass** — admin XP corrections go through `admin_grant` (which writes a transaction, fires the trigger, updates the cache); pure cache repair goes through `audit_recompute_user_caches`.

**Audit query (`audit_user_xp_drift`):**
```sql
SELECT
  b.user_id,
  b.individual_exp - COALESCE(t.individual_exp_sum, 0) AS individual_exp_drift,
  b.team_exp       - COALESCE(t.team_exp_sum, 0)       AS team_exp_drift,
  b.individual_points - COALESCE(t.individual_points_sum, 0) AS individual_points_drift,
  b.team_points       - COALESCE(t.team_points_sum, 0)       AS team_points_drift
FROM public.user_balances b
LEFT JOIN (
  SELECT
    user_id,
    SUM(xp_change)     FILTER (WHERE context = 'individual') AS individual_exp_sum,
    SUM(xp_change)     FILTER (WHERE context = 'team')       AS team_exp_sum,
    SUM(points_change) FILTER (WHERE context = 'individual') AS individual_points_sum,
    SUM(points_change) FILTER (WHERE context = 'team')       AS team_points_sum
  FROM public.transactions
  GROUP BY user_id
) t ON t.user_id = b.user_id
WHERE b.individual_exp     <> COALESCE(t.individual_exp_sum, 0)
   OR b.team_exp           <> COALESCE(t.team_exp_sum, 0)
   OR b.individual_points  <> COALESCE(t.individual_points_sum, 0)
   OR b.team_points        <> COALESCE(t.team_points_sum, 0);
```

**Schedule:** daily cron, **per active cohort**. The audit RPC signature is `audit_user_xp_drift(p_cohort_id uuid)` — cron loops active cohorts and calls per-cohort. At 2k students × 5 cohorts = 5 fast scans, each ~1s. Massively cheaper than a single global scan over a partitioned `transactions` table.

**Recovery:** `audit_recompute_user_caches(p_user_id)` — recomputes one user from the ledger.

---

### 2. Active membership matches team cohort

A user can only be an active member of a team in their own cohort.

**Statement:** for every active `team_members` row, `users.data.cohort_id = teams.cohort_id`.

**Enforced by:** trigger on `team_members` INSERT/UPDATE; also enforced inside `accept_invitation` RPC.

**Audit:**
```sql
SELECT tm.id, tm.team_id, tm.user_id
FROM public.team_members tm
JOIN public."users.data" u ON u.id = tm.user_id
JOIN public.teams t ON t.id = tm.team_id
WHERE tm.left_at IS NULL
  AND u.cohort_id <> t.cohort_id;
```

---

### 3. One active team per user

A user is active in at most one team at a time.

**Enforced by:** partial UNIQUE index `(user_id) WHERE left_at IS NULL` on `team_members`.

**Audit:**
```sql
SELECT user_id, COUNT(*) AS active_team_count
FROM public.team_members
WHERE left_at IS NULL
GROUP BY user_id
HAVING COUNT(*) > 1;
```

---

### 4. One active task progress per (user, task) for individual; per (team, task) for team

For non-recurring team tasks, also a lifetime cap. For recurring team tasks, only one *active* row at a time, but historical completions are allowed.

**Enforced by:**
- `individual_task_progress`: UNIQUE `(user_id, task_id)` (single row, status reused)
- `team_task_progress`: partial UNIQUE `(team_id, task_id) WHERE status IN ('in_progress', 'submitted', 'in_review')`

**Audit (individual):**
```sql
SELECT user_id, task_id, COUNT(*)
FROM public.individual_task_progress
GROUP BY user_id, task_id
HAVING COUNT(*) > 1;
```

**Audit (team active):**
```sql
SELECT team_id, task_id, COUNT(*)
FROM public.team_task_progress
WHERE status IN ('in_progress', 'submitted', 'in_review')
GROUP BY team_id, task_id
HAVING COUNT(*) > 1;
```

---

### 5. Peer reviewers are not in the submitting team

For every `team_task_reviews` row with `reviewer_role = 'peer'`, the reviewer is NOT an active member of the submitting team at any point during their review.

**Enforced by:** trigger on `team_task_reviews` INSERT (and on `team_members` INSERT — if a peer reviewer somehow joins the team mid-review, that join must be blocked or the review cancelled).

**Audit:**
```sql
SELECT r.id AS review_id, r.reviewer_user_id, p.team_id
FROM public.team_task_reviews r
JOIN public.team_task_progress p ON p.id = r.team_task_progress_id
JOIN public.team_members tm
  ON tm.team_id = p.team_id
 AND tm.user_id = r.reviewer_user_id
WHERE r.reviewer_role = 'peer'
  AND tm.left_at IS NULL;
```

---

### 6. Admin reviewers are admins

For every `team_task_reviews` row with `reviewer_role = 'admin'`, the reviewer's `users.data.primary_role = 'admin'` at review-creation time.

**Enforced by:** trigger on `team_task_reviews` INSERT.

**Audit:**
```sql
SELECT r.id AS review_id, r.reviewer_user_id
FROM public.team_task_reviews r
JOIN public."users.data" u ON u.id = r.reviewer_user_id
WHERE r.reviewer_role = 'admin'
  AND u.primary_role <> 'admin';
```

(Admins demoted later don't retroactively invalidate reviews — that's by design.)

---

### 7. Milestones never paid twice

Each user gets each individual milestone at most once; each team gets each team milestone at most once.

**Enforced by:** UNIQUE `(user_id, milestone_id)` on `individual_milestone_unlocks`; UNIQUE `(team_id, milestone_id)` on `team_milestone_unlocks`.

**Audit:**
```sql
SELECT user_id, milestone_id, COUNT(*)
FROM public.individual_milestone_unlocks
GROUP BY user_id, milestone_id HAVING COUNT(*) > 1
UNION ALL
SELECT NULL, milestone_id, COUNT(*)
FROM public.team_milestone_unlocks
GROUP BY team_id, milestone_id HAVING COUNT(*) > 1;
```

---

### 8. Weekly reports unique per (user, context, week)

**Enforced by:** UNIQUE `(user_id, context, week_start_date)` on `weekly_reports`.

**Audit:**
```sql
SELECT user_id, context, week_start_date, COUNT(*)
FROM public.weekly_reports
GROUP BY user_id, context, week_start_date
HAVING COUNT(*) > 1;
```

---

### 9. Excused absences within quota

The number of active (non-cancelled) `excused` absences for a user never exceeds `users.data.absence_quota`.

**Enforced by:** `register_excused_absence` RPC (with row-level locking to prevent races).

**Audit:**
```sql
SELECT
  a.user_id,
  COUNT(*) FILTER (WHERE a.cancelled_at IS NULL) AS active_excused,
  u.absence_quota
FROM public.absences a
JOIN public."users.data" u ON u.id = a.user_id
WHERE a.type = 'excused'
GROUP BY a.user_id, u.absence_quota
HAVING COUNT(*) FILTER (WHERE a.cancelled_at IS NULL) > u.absence_quota;
```

---

### 10. Phase consistency with journey state

If `users.data.phase = 'team'`, the user has at least one active `team_members` row.
If `phase = 'individual'`, no active `team_members` row.
If `phase = 'graduated'`, the user's last team's `team_journey` has all stages `completed`, OR they completed both journeys.

**Enforced by:** triggers on `team_members` INSERT/UPDATE and on `individual_journey` / `team_journey` status changes (advance phase as side effect).

**Audit (basic):**
```sql
-- phase=team but no active membership
SELECT u.id
FROM public."users.data" u
WHERE u.phase = 'team'
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = u.id AND tm.left_at IS NULL
  )
UNION ALL
-- phase=individual but has active membership
SELECT u.id
FROM public."users.data" u
WHERE u.phase = 'individual'
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = u.id AND tm.left_at IS NULL
  );
```

---

### 11. Append-only ledger

`transactions` rows are never UPDATEd or DELETEd after creation.

**Enforced by:** RLS denies UPDATE/DELETE (no policies grant them); reversals are new rows of `type = 'reversal'`.

**Audit:** N/A — Postgres won't let it happen if RLS is correct.

**Test:** as `authenticated`, attempt `UPDATE transactions SET xp_change = 0 WHERE id = X` — must error.

---

### 12. Polymorphic source rows exist

When `transactions.source_table` and `source_id` are set, the referenced row exists in that table.

**Enforced by:** the DEFINER function that wrote the transaction validates first. (No DB-level enforcement possible.)

**Audit (per known source table):**
```sql
-- e.g. for team_task_progress
SELECT t.id AS transaction_id, t.source_id
FROM public.transactions t
WHERE t.source_table = 'team_task_progress'
  AND NOT EXISTS (SELECT 1 FROM public.team_task_progress p WHERE p.id = t.source_id);
-- repeat for every distinct source_table value
```

A SQL function `audit_orphan_polymorphic_sources()` should iterate the known-source-table list and union these checks.

---

### 13. Notifications and activity_events created idempotently

A given event (e.g. "weekly_report_reminder_2day for user X for week Y") never produces duplicate rows.

**Enforced by:** DEFINER helpers check existence before INSERT, often via `(user_id, type, source_id)` lookup.

**Audit:**
```sql
SELECT user_id, type, source_id, COUNT(*)
FROM public.notifications
WHERE source_id IS NOT NULL
GROUP BY user_id, type, source_id
HAVING COUNT(*) > 1;
```

---

### 14. Founder is an active member of their team

If `teams.status = 'active'`, the user `teams.founder_id` has an active `team_members` row in that team with `team_role = 'founder'`.

**Enforced by:** trigger on `teams` UPDATE (founder transfer flow); trigger on `team_members` UPDATE (cannot leave as founder of active team).

**Audit:**
```sql
SELECT t.id AS team_id, t.founder_id
FROM public.teams t
WHERE t.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = t.id
      AND tm.user_id = t.founder_id
      AND tm.left_at IS NULL
      AND tm.team_role = 'founder'
  );
```

---

### 15. Submission attempt cap (anti-collusion)

`team_task_progress.submission_attempt` never exceeds 4. Attempts 1–3 are peer-reviewed; attempt 4 is **always admin-reviewed**, regardless of `task_type`. Beyond 4, `submit_team_task_review` raises `submission_attempt_cap_exceeded` and the row sticks at 4.

**Enforced by:**
- CHECK constraint `submission_attempt <= 4` on `team_task_progress`
- `assign_team_task_review` forces `reviewer_role = 'admin'` when `submission_attempt = 4` regardless of `task_type` (closes the cancel-then-restart loophole)
- `submit_team_task_review` (peer) raises `submission_attempt_cap_exceeded` if the rejection-then-resubmit would push past 4

**Audit:**
```sql
-- Should always be empty
SELECT id, team_id, task_id, submission_attempt
FROM public.team_task_progress
WHERE submission_attempt > 4;

-- Submissions on attempt 4 should ALL be admin-reviewed
SELECT p.id, p.submission_attempt, r.reviewer_role
FROM public.team_task_progress p
JOIN public.team_task_reviews r ON r.team_task_progress_id = p.id
                                AND r.submission_attempt = p.submission_attempt
WHERE p.submission_attempt = 4
  AND p.status IN ('submitted', 'in_review', 'approved', 'rejected')
  AND r.reviewer_role <> 'admin';
```

---

### 16. Peer reviewer never an active member of submitting team

For every `team_task_reviews` row with `reviewer_role = 'peer'` and `status = 'pending'`, the reviewer is NOT currently an active member of the submitting team.

**Enforced by:**
- INSERT trigger on `team_task_reviews` checks at assignment time
- AFTER INSERT trigger on `team_members` cancels any pending reviews where the new member is the reviewer for that team
- `accept_invitation` RPC pre-checks and refuses invitations where the invitee has pending reviews against the inviting team

**Audit:** see invariant #5 above (kept here as cross-reference — these are the same concern, with #5 being the static check and this being the dynamic guarantee under membership changes).

---

### 17. `last_active_at` debounce contract

`users.data.last_active_at` is updated by the `record_user_active()` RPC, which is debounced — only writes if the existing value is older than 60 minutes. App middleware calls it on every authenticated request; the RPC enforces the debounce internally. This caps writes at ~24/user/day regardless of request volume.

**Enforced by:** the RPC body itself contains the WHERE clause `last_active_at < now() - interval '60 minutes'`. No CHECK constraint — the RPC is the contract.

**Audit:** none needed — invalid writes are simply impossible if app code only goes through the RPC. CI gate confirms no other writer exists.

---

### 18. Cohort scoping is consistent

Every non-admin user has a `cohort_id`. Every team has a `cohort_id`.

**Enforced by:**
- `users.data` CHECK: `primary_role = 'admin' OR cohort_id IS NOT NULL`
- `teams.cohort_id` is NOT NULL with FK

**Audit:** the CHECK constraints handle this; just verify they exist post-migration.

---

## Audit job schedule (recommended)

| Job | Cadence | Action on failure |
|---|---|---|
| `audit_user_xp_drift` | daily 03:00 | alert admin; do not auto-fix |
| `audit_orphan_polymorphic_sources` | weekly | alert |
| Phase consistency (#10) | daily | alert |
| Founder consistency (#14) | daily | alert |
| Notifications dedupe (#13) | weekly | alert |
| Membership-cohort match (#2) | daily | alert |
| Active team uniqueness (#3) | daily | alert |

Alerts go to the admin dashboard + email. None of these should ever fire in healthy state — if they do, the schema or an RPC has a bug, not a temporary blip.

---

## What this document is and is not

This is the **truth contract** of V2. Every invariant listed must hold, with the listed enforcement mechanism. If a developer is about to write code that could violate any of these, the code is wrong — not the invariant.

This is NOT:
- A list of business rules (those live in the table specs)
- A list of "nice to have" properties (every entry here is mandatory)
- A migration guide (separate doc when greenfield deploy is planned)
