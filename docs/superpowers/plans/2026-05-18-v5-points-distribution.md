# V5 Points Distribution Rebalance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current divide-by-N team-task reward distribution with a V5 model that adds a team-size upmark bonus, AND inflate existing user totals once by the current team-size factor.

**Architecture:** V2 pattern. Add a `get_v5_upmark_factor()` helper plus a new `distribute_team_rewards_v2()` RPC that applies the upmark. Switch `submit_external_peer_review` to call V2; leave V1 in place for instant rollback. Run a single backfill migration that grants one `admin_grant` transaction per affected user, inflating their historical team-task earnings using their CURRENT team size. Achievements, individual tasks, client meetings, strikes, and reviewer rewards are NOT touched.

**Tech Stack:** Postgres 17 + Supabase MCP migrations, Next.js 16 App Router (frontend unaffected), Vitest tests with admin client.

**Project ID:** `ksoohvygoysofvtqdumz`

---

## V5 Upmark Reference Table

| Team size | Upmark factor | Per-member reward for base=240 | Team total |
|---|---|---|---|
| 1 | 1.00 | 240 | 240 |
| 2 | 1.30 | 156 | 312 |
| 3 | 1.50 | 120 | 360 |
| 4 | 1.70 | 102 | 408 |
| 5 | 1.70 | 81.6 → ROUND 82 | 410 |
| 6+ | 1.70 | 68 | 408 |

Formula: `per_member = ROUND( (base / team_size) * upmark )`

---

## File Structure

Files to be created or modified:

- **Migration via `mcp__supabase__apply_migration`** — `v5_upmark_helper` — adds `get_v5_upmark_factor()`
- **Migration via `mcp__supabase__apply_migration`** — `v5_distribute_team_rewards_v2` — adds the V2 distributor
- **Migration via `mcp__supabase__apply_migration`** — `v5_wire_up_peer_review` — switches `submit_external_peer_review` to call V2
- **Migration via `mcp__supabase__apply_migration`** — `v5_backfill_inflate_totals` — one-shot inflation
- (new) `tests/rewards/v5-distribution.test.ts` — Vitest tests for V2 RPC behavior
- (modify) `src/types/database.ts` — regenerated via Supabase CLI after migrations
- (new) `docs/superpowers/plans/2026-05-18-v5-points-distribution.snapshot.md` — captured baseline before backfill (for verification)

No frontend code, no API route changes. The leaderboard, transaction history, and dashboards already read `users.total_points` / `transactions` and will reflect the new values automatically.

---

## Scope Boundaries

**In scope:**
- Team task point/XP distribution at peer-review approval
- One-time inflation of `users.total_points` and `users.total_xp` for existing team members

**Explicitly out of scope (left on current logic):**
- `complete_individual_task` — individual tasks
- `award_team_achievement` — team achievements (despite same divide-by-N bug)
- `complete_meeting` — client meetings (flat 25/50 to one user)
- `team_strikes` — strike penalties
- Reviewer reward (10% of base)
- Backup functions: `submit_external_peer_review_backup_v2`, `submit_external_peer_review_backup_v3`, `distribute_team_rewards` (kept for rollback)
- Users currently without a team — get factor 1.00 (no inflation)
- Members of archived teams — `left_at IS NOT NULL` → treated as no team → factor 1.00

---

### Task 0: Pre-flight backup and branch check

**Files:** none

- [ ] **Step 1: Confirm we are on `develop` branch**

Run:
```bash
git status
```
Expected: `On branch develop`

- [ ] **Step 2: Take manual Supabase backup**

Open the Supabase dashboard for project `ksoohvygoysofvtqdumz` → Database → Backups → "Take backup now". Note the timestamp.

Manual step. No automation — this is a CLAUDE.md hard rule for any schema change.

- [ ] **Step 3: Record backup timestamp**

Add a note to the eventual commit message referencing the backup time.

---

### Task 1: Capture baseline snapshot

**Files:**
- Create: `docs/superpowers/plans/2026-05-18-v5-points-distribution.snapshot.md`

- [ ] **Step 1: Run baseline snapshot SQL via Supabase MCP**

```sql
-- Top 25 users with team context + breakdown
with team_size_per_user as (
  select tm.user_id, t.id as team_id, t.name as team_name, t.member_count
  from team_members tm
  join teams t on tm.team_id = t.id
  where tm.left_at is null and t.status = 'active'
)
select
  u.id,
  u.name,
  u.total_points,
  u.total_xp,
  tsu.team_name,
  coalesce(tsu.member_count, 0) as current_team_size,
  coalesce(sum(case when tx.type='task' and tx.points_type='team' then tx.points_change end), 0) as historical_team_task_pts,
  coalesce(sum(case when tx.type='task' and tx.points_type='team' then tx.xp_change end), 0) as historical_team_task_xp
from users u
left join team_size_per_user tsu on tsu.user_id = u.id
left join transactions tx on tx.user_id = u.id
where u.status='active' and u.primary_role='user'
group by u.id, u.name, u.total_points, u.total_xp, tsu.team_name, tsu.member_count
order by u.total_points desc
limit 25;
```

- [ ] **Step 2: Save the result as a markdown table in the snapshot file**

Write the result to `docs/superpowers/plans/2026-05-18-v5-points-distribution.snapshot.md` so we can compare after the backfill.

- [ ] **Step 3: Commit the snapshot**

```bash
git add docs/superpowers/plans/2026-05-18-v5-points-distribution.snapshot.md
git commit -m "docs: capture pre-V5 leaderboard snapshot"
```

---

### Task 2: Add `get_v5_upmark_factor()` helper

**Files:**
- New migration `v5_upmark_helper` applied via `mcp__supabase__apply_migration`

- [ ] **Step 1: Apply the helper migration**

Call `mcp__supabase__apply_migration` with name `v5_upmark_helper` and the following SQL:

```sql
CREATE OR REPLACE FUNCTION public.get_v5_upmark_factor(p_member_count integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT CASE
    WHEN p_member_count <= 1 THEN 1.00
    WHEN p_member_count = 2 THEN 1.30
    WHEN p_member_count = 3 THEN 1.50
    ELSE 1.70
  END::numeric;
$$;

COMMENT ON FUNCTION public.get_v5_upmark_factor(integer) IS
  'V5 distribution upmark factor by team size. 1.00 / 1.30 / 1.50 / 1.70 (capped at 4+ members). Source of truth for both distribute_team_rewards_v2 and the V5 backfill migration.';
```

- [ ] **Step 2: Verify the function works**

Run via Supabase MCP `execute_sql`:
```sql
select get_v5_upmark_factor(0) as zero,
       get_v5_upmark_factor(1) as one,
       get_v5_upmark_factor(2) as two,
       get_v5_upmark_factor(3) as three,
       get_v5_upmark_factor(4) as four,
       get_v5_upmark_factor(10) as ten;
```

Expected: `zero=1.00, one=1.00, two=1.30, three=1.50, four=1.70, ten=1.70`

- [ ] **Step 3: Commit (no code files yet but record the migration name)**

This step is informational — `mcp__supabase__apply_migration` writes to the remote DB directly. Track the migration name in the commit for Task 4.

---

### Task 3: Add `distribute_team_rewards_v2()`

**Files:**
- New migration `v5_distribute_team_rewards_v2` applied via `mcp__supabase__apply_migration`

- [ ] **Step 1: Apply the V2 distributor migration**

Call `mcp__supabase__apply_migration` with name `v5_distribute_team_rewards_v2` and the following SQL:

```sql
CREATE OR REPLACE FUNCTION public.distribute_team_rewards_v2(
    p_team_id uuid,
    p_xp_amount integer,
    p_points_amount integer,
    p_task_id uuid DEFAULT NULL::uuid,
    p_task_title text DEFAULT NULL::text,
    p_progress_id uuid DEFAULT NULL::uuid,
    p_reviewer_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    v_member_count INTEGER;
    v_upmark NUMERIC;
    v_xp_per_member INTEGER;
    v_points_per_member INTEGER;
    v_member RECORD;
    v_description TEXT;
BEGIN
    SELECT COUNT(*) INTO v_member_count
    FROM team_members
    WHERE team_id = p_team_id AND left_at IS NULL;

    IF v_member_count = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No active team members found',
            'team_id', p_team_id
        );
    END IF;

    v_upmark := public.get_v5_upmark_factor(v_member_count);
    v_xp_per_member := ROUND((p_xp_amount::numeric / v_member_count) * v_upmark);
    v_points_per_member := ROUND((p_points_amount::numeric / v_member_count) * v_upmark);

    IF p_task_title IS NOT NULL THEN
        v_description := 'Task completed: ' || p_task_title;
    ELSE
        v_description := 'Team reward distribution';
    END IF;

    FOR v_member IN
        SELECT tm.user_id
        FROM team_members tm
        WHERE tm.team_id = p_team_id AND tm.left_at IS NULL
    LOOP
        UPDATE users
        SET total_xp = total_xp + v_xp_per_member,
            total_points = total_points + v_points_per_member,
            updated_at = NOW()
        WHERE id = v_member.user_id;

        INSERT INTO transactions (
            user_id,
            task_id,
            team_id,
            type,
            xp_change,
            points_change,
            points_type,
            description,
            activity_type,
            metadata
        ) VALUES (
            v_member.user_id,
            p_task_id,
            p_team_id,
            'task',
            v_xp_per_member,
            v_points_per_member,
            'team',
            v_description,
            'team',
            json_build_object(
                'task_title', p_task_title,
                'progress_id', p_progress_id,
                'reviewer_id', p_reviewer_id,
                'team_member_count', v_member_count,
                'total_team_xp', p_xp_amount,
                'total_team_points', p_points_amount,
                'upmark_factor', v_upmark,
                'distribution_type', 'peer_review_approved_v5',
                'distribution_version', 'v2'
            )
        );
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'team_id', p_team_id,
        'member_count', v_member_count,
        'upmark_factor', v_upmark,
        'total_xp_distributed', p_xp_amount,
        'total_points_distributed', p_points_amount,
        'xp_per_member', v_xp_per_member,
        'points_per_member', v_points_per_member,
        'transaction_records_created', v_member_count,
        'version', 'v2'
    );

EXCEPTION WHEN others THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'team_id', p_team_id,
        'version', 'v2'
    );
END;
$$;

COMMENT ON FUNCTION public.distribute_team_rewards_v2(uuid, integer, integer, uuid, text, uuid, uuid) IS
  'V5 team reward distribution. Applies size-based upmark factor (see get_v5_upmark_factor). Replaces distribute_team_rewards. Old function kept for rollback.';
```

- [ ] **Step 2: Sanity-check the function exists and is callable but DO NOT call against a real team yet**

```sql
select pg_get_function_arguments(oid) as args, pg_get_function_result(oid) as ret
from pg_proc where proname = 'distribute_team_rewards_v2';
```

Expected: returns one row with the function signature.

---

### Task 4: Add behavior tests for V2 distributor

**Files:**
- Create: `tests/rewards/v5-distribution.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
/**
 * V5 Team Reward Distribution Tests
 *
 * Verifies distribute_team_rewards_v2 applies the correct upmark factor
 * for each team size and updates both users.total_points and transactions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getAdminClient,
  createTestUser,
  createTestTeam,
  addTestTeamMember,
  getUserStats,
  getAnyTaskId,
} from "../setup";

describe("V5 team reward distribution", () => {
  it("solo team (size 1) gets full base reward, factor 1.00", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Solo Founder" });
    const team = await createTestTeam(founder.id);
    await addTestTeamMember(team.id, founder.id, "founder");
    const taskId = await getAnyTaskId();

    const { data, error } = await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 200,
      p_points_amount: 240,
      p_task_id: taskId,
      p_task_title: "V5 Solo Test",
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.member_count).toBe(1);
    expect(Number(data.upmark_factor)).toBe(1.0);
    expect(data.points_per_member).toBe(240);
    expect(data.xp_per_member).toBe(200);

    const stats = await getUserStats(founder.id);
    expect(stats.total_points).toBe(240);
    expect(stats.total_xp).toBe(200);
  });

  it("duo team (size 2) gets base/2 * 1.30 per member", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Duo Founder" });
    const member = await createTestUser({ name: "V5 Duo Member" });
    const team = await createTestTeam(founder.id);
    await addTestTeamMember(team.id, founder.id, "founder");
    await addTestTeamMember(team.id, member.id, "member");
    const taskId = await getAnyTaskId();

    const { data, error } = await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 200,
      p_points_amount: 240,
      p_task_id: taskId,
      p_task_title: "V5 Duo Test",
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.member_count).toBe(2);
    expect(Number(data.upmark_factor)).toBe(1.3);
    // 240/2 = 120, * 1.30 = 156
    expect(data.points_per_member).toBe(156);
    // 200/2 = 100, * 1.30 = 130
    expect(data.xp_per_member).toBe(130);

    const founderStats = await getUserStats(founder.id);
    const memberStats = await getUserStats(member.id);
    expect(founderStats.total_points).toBe(156);
    expect(memberStats.total_points).toBe(156);
  });

  it("trio team (size 3) gets base/3 * 1.50 per member", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Trio Founder" });
    const m1 = await createTestUser({ name: "V5 Trio M1" });
    const m2 = await createTestUser({ name: "V5 Trio M2" });
    const team = await createTestTeam(founder.id);
    await addTestTeamMember(team.id, founder.id, "founder");
    await addTestTeamMember(team.id, m1.id, "member");
    await addTestTeamMember(team.id, m2.id, "member");
    const taskId = await getAnyTaskId();

    const { data, error } = await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 200,
      p_points_amount: 240,
      p_task_id: taskId,
      p_task_title: "V5 Trio Test",
    });

    expect(error).toBeNull();
    expect(data.member_count).toBe(3);
    expect(Number(data.upmark_factor)).toBe(1.5);
    // 240/3 = 80, * 1.50 = 120
    expect(data.points_per_member).toBe(120);
  });

  it("quad team (size 4) gets base/4 * 1.70 per member", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Quad Founder" });
    const m1 = await createTestUser({ name: "V5 Quad M1" });
    const m2 = await createTestUser({ name: "V5 Quad M2" });
    const m3 = await createTestUser({ name: "V5 Quad M3" });
    const team = await createTestTeam(founder.id);
    await addTestTeamMember(team.id, founder.id, "founder");
    await addTestTeamMember(team.id, m1.id, "member");
    await addTestTeamMember(team.id, m2.id, "member");
    await addTestTeamMember(team.id, m3.id, "member");
    const taskId = await getAnyTaskId();

    const { data, error } = await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 200,
      p_points_amount: 240,
      p_task_id: taskId,
      p_task_title: "V5 Quad Test",
    });

    expect(error).toBeNull();
    expect(data.member_count).toBe(4);
    expect(Number(data.upmark_factor)).toBe(1.7);
    // 240/4 = 60, * 1.70 = 102
    expect(data.points_per_member).toBe(102);
  });

  it("inserts transactions with V5 metadata for every member", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Tx Founder" });
    const member = await createTestUser({ name: "V5 Tx Member" });
    const team = await createTestTeam(founder.id);
    await addTestTeamMember(team.id, founder.id, "founder");
    await addTestTeamMember(team.id, member.id, "member");
    const taskId = await getAnyTaskId();

    await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 100,
      p_points_amount: 200,
      p_task_id: taskId,
      p_task_title: "V5 Tx Test",
    });

    const { data: txns } = await sb
      .from("transactions")
      .select("user_id, points_change, metadata")
      .eq("team_id", team.id)
      .eq("type", "task");

    expect(txns).toHaveLength(2);
    for (const t of txns ?? []) {
      expect(t.points_change).toBe(130); // (200/2)*1.30
      expect((t.metadata as Record<string, unknown>).distribution_version).toBe(
        "v2"
      );
      expect(
        Number((t.metadata as Record<string, unknown>).upmark_factor)
      ).toBe(1.3);
      expect((t.metadata as Record<string, unknown>).team_member_count).toBe(2);
    }
  });

  it("returns error for team with no active members", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Empty Founder" });
    const team = await createTestTeam(founder.id);
    // No team members added

    const { data } = await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 100,
      p_points_amount: 100,
    });

    expect(data.success).toBe(false);
    expect(data.error).toContain("No active team members");
  });
});
```

- [ ] **Step 2: Run the tests and verify all pass**

```bash
npx vitest run tests/rewards/v5-distribution.test.ts
```

Expected: 6 passing tests, 0 failures.

- [ ] **Step 3: Commit the tests**

```bash
git add tests/rewards/v5-distribution.test.ts
git commit -m "test: V5 team reward distribution behavior (V2 RPC)"
```

---

### Task 5: Switch `submit_external_peer_review` to call V2

**Files:**
- New migration `v5_wire_up_peer_review` applied via `mcp__supabase__apply_migration`

- [ ] **Step 1: Apply the migration that recreates `submit_external_peer_review` calling V2**

The body is IDENTICAL to the current function except the single line `SELECT distribute_team_rewards(...)` becomes `SELECT distribute_team_rewards_v2(...)`. Call `mcp__supabase__apply_migration` with name `v5_wire_up_peer_review` and:

```sql
CREATE OR REPLACE FUNCTION public.submit_external_peer_review(
    p_progress_id uuid,
    p_decision text,
    p_feedback text DEFAULT NULL::text,
    p_is_continuation boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
    task_record RECORD;
    team_id_var UUID;
    task_xp INTEGER;
    task_points INTEGER;
    distribution_result JSON;
    reviewer_xp INTEGER;
    reviewer_points INTEGER;
    current_user_id UUID;
    task_title TEXT;
    task_id_var UUID;
    existing_review_count INTEGER;
BEGIN
    current_user_id := auth.uid();

    SELECT
        tp.id,
        tp.task_id,
        tp.team_id,
        tp.context,
        tp.assigned_to_user_id,
        t.base_xp_reward,
        t.base_points_reward,
        t.title
    INTO task_record
    FROM task_progress tp
    JOIN tasks t ON tp.task_id = t.id
    WHERE tp.id = p_progress_id;

    IF task_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Task not found',
            'progress_id', p_progress_id
        );
    END IF;

    task_xp := COALESCE(task_record.base_xp_reward, 0);
    task_points := COALESCE(task_record.base_points_reward, 0);
    reviewer_xp := GREATEST(1, ROUND(task_xp * 0.1));
    reviewer_points := GREATEST(1, ROUND(task_points * 0.1));
    task_title := task_record.title;
    task_id_var := task_record.task_id;

    IF NOT p_is_continuation THEN
        SELECT COUNT(*) INTO existing_review_count
        FROM transactions
        WHERE user_id = current_user_id
            AND metadata->>'progress_id' = p_progress_id::text
            AND type = 'validation'
            AND description LIKE 'Peer review completed:%'
            AND created_at > COALESCE(
              (SELECT tp.last_completed_at FROM task_progress tp WHERE tp.id = p_progress_id),
              '1970-01-01'::timestamptz
            );

        IF existing_review_count > 0 THEN
            RETURN json_build_object(
                'success', false,
                'error', 'DUPLICATE PREVENTION: Reviewer has already been rewarded for this task',
                'progress_id', p_progress_id,
                'existing_reviews', existing_review_count
            );
        END IF;
    END IF;

    UPDATE users
    SET total_xp = total_xp + reviewer_xp,
        total_points = total_points + reviewer_points,
        updated_at = NOW()
    WHERE id = current_user_id;

    INSERT INTO transactions (
        user_id, task_id, type, xp_change, points_change, points_type,
        description, activity_type, metadata
    ) VALUES (
        current_user_id,
        task_id_var,
        'validation',
        reviewer_xp,
        reviewer_points,
        'individual',
        'Peer review completed: ' || task_title,
        'team',
        json_build_object(
            'task_title', task_title,
            'progress_id', p_progress_id,
            'decision', p_decision,
            'reviewer_percentage', '10% of task rewards',
            'base_task_xp', task_xp,
            'base_task_points', task_points,
            'is_actual_reviewer', true,
            'reviewer_user_id', current_user_id,
            'is_continuation', p_is_continuation
        )
    );

    IF p_decision = 'accepted' THEN
        UPDATE task_progress
        SET status = 'approved',
            review_feedback = p_feedback,
            reviewer_user_id = current_user_id,
            updated_at = NOW()
        WHERE id = p_progress_id;

        PERFORM add_peer_review_history_entry(
            p_progress_id, 'review_completed', current_user_id, 'approved', p_feedback
        );

        IF task_record.context = 'team' AND task_record.team_id IS NOT NULL THEN
            -- V5 SWITCH: call v2 instead of v1
            SELECT distribute_team_rewards_v2(
                task_record.team_id,
                task_xp,
                task_points,
                task_id_var,
                task_title,
                p_progress_id,
                current_user_id
            ) INTO distribution_result;
        ELSIF task_record.context = 'individual' AND task_record.assigned_to_user_id IS NOT NULL THEN
            UPDATE users
            SET total_xp = total_xp + task_xp,
                total_points = total_points + task_points,
                updated_at = NOW()
            WHERE id = task_record.assigned_to_user_id;

            INSERT INTO transactions (
                user_id, task_id, type, xp_change, points_change, points_type,
                description, activity_type, metadata
            ) VALUES (
                task_record.assigned_to_user_id,
                task_id_var,
                'task',
                task_xp,
                task_points,
                'individual',
                'Task completed: ' || task_title,
                'individual',
                json_build_object(
                    'task_title', task_title,
                    'progress_id', p_progress_id,
                    'reviewer_id', current_user_id,
                    'context', 'individual',
                    'completion_type', 'peer_review_approved'
                )
            );

            distribution_result := json_build_object(
                'success', true,
                'individual_reward', true,
                'user_id', task_record.assigned_to_user_id,
                'xp_awarded', task_xp,
                'points_awarded', task_points
            );
        END IF;
    ELSE
        UPDATE task_progress
        SET status = 'rejected',
            review_feedback = p_feedback,
            reviewer_user_id = current_user_id,
            updated_at = NOW()
        WHERE id = p_progress_id;

        PERFORM add_peer_review_history_entry(
            p_progress_id, 'review_completed', current_user_id, 'rejected', p_feedback
        );

        distribution_result := json_build_object('success', true, 'task_rejected', true);
    END IF;

    RETURN json_build_object(
        'success', true,
        'progress_id', p_progress_id,
        'decision', p_decision,
        'task_context', task_record.context,
        'team_id', task_record.team_id,
        'task_xp', task_xp,
        'task_points', task_points,
        'task_reward_distribution', distribution_result,
        'reviewer_reward', json_build_object(
            'user_id', current_user_id,
            'xp_earned', reviewer_xp,
            'points_earned', reviewer_points,
            'percentage', '10% of task rewards',
            'is_continuation', p_is_continuation,
            'paid_for_decision', p_decision
        ),
        'distribution_version', 'v2'
    );

EXCEPTION WHEN others THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'progress_id', p_progress_id
    );
END;
$$;
```

- [ ] **Step 2: Re-run the existing peer-review tests to confirm no regression**

```bash
npx vitest run tests/rewards/peer-review.test.ts tests/rewards/task-approval.test.ts
```

Expected: all existing tests still pass.

- [ ] **Step 3: Verify integration by approving one real team task via develop preview UI (manual smoke)**

On the develop preview URL, open `/dashboard/peer-review`, approve a real team task (preferably a small one — base 88-104 range), then check via Supabase MCP:

```sql
select user_id, xp_change, points_change, metadata->>'distribution_version' as ver,
       metadata->>'upmark_factor' as factor, metadata->>'team_member_count' as size
from transactions
where type='task' and points_type='team'
order by created_at desc
limit 5;
```

Expected: `ver=v2`, `factor` matches team size, all members of the approved task's team have a row.

---

### Task 6: Dry-run the backfill calculation

**Files:** none (read-only query)

- [ ] **Step 1: Run the dry-run SQL via Supabase MCP**

```sql
with current_team_size as (
  select tm.user_id, t.member_count
  from team_members tm
  join teams t on tm.team_id = t.id
  where tm.left_at is null and t.status = 'active'
),
hist as (
  select tx.user_id,
         sum(tx.points_change) as hist_team_pts,
         sum(tx.xp_change) as hist_team_xp,
         count(*) as hist_team_task_count
  from transactions tx
  where tx.type = 'task' and tx.points_type = 'team'
  group by tx.user_id
),
plan as (
  select
    u.id as user_id,
    u.name,
    coalesce(cts.member_count, 0) as current_team_size,
    coalesce(public.get_v5_upmark_factor(coalesce(cts.member_count, 1)) - 1, 0) as inflation_factor,
    coalesce(h.hist_team_pts, 0) as hist_team_pts,
    coalesce(h.hist_team_xp, 0) as hist_team_xp,
    coalesce(h.hist_team_task_count, 0) as hist_team_task_count,
    round(coalesce(h.hist_team_pts, 0) * (public.get_v5_upmark_factor(coalesce(cts.member_count, 1)) - 1)) as delta_pts,
    round(coalesce(h.hist_team_xp, 0) * (public.get_v5_upmark_factor(coalesce(cts.member_count, 1)) - 1)) as delta_xp,
    u.total_points as current_total_pts,
    u.total_xp as current_total_xp
  from users u
  left join current_team_size cts on cts.user_id = u.id
  left join hist h on h.user_id = u.id
  where u.status = 'active'
)
select * from plan
where delta_pts > 0 or delta_xp > 0
order by delta_pts desc;
```

- [ ] **Step 2: Eyeball the result**

Check:
- Solo founders (team_size=1) — should NOT appear (delta=0).
- Users without an active team — should NOT appear.
- Largest delta should be in the 1500–3500 range (per the analysis earlier).
- No delta should be negative.
- No `delta_pts` should approach 50000 (transactions check constraint upper bound).

- [ ] **Step 3: Append the dry-run result to the snapshot doc**

Open `docs/superpowers/plans/2026-05-18-v5-points-distribution.snapshot.md` and add a "Dry-run inflation table" section with the per-user delta rows. Commit:

```bash
git add docs/superpowers/plans/2026-05-18-v5-points-distribution.snapshot.md
git commit -m "docs: V5 backfill dry-run results"
```

---

### Task 7: Apply the backfill migration

**Files:**
- New migration `v5_backfill_inflate_totals` applied via `mcp__supabase__apply_migration`

- [ ] **Step 1: Apply the backfill migration**

Call `mcp__supabase__apply_migration` with name `v5_backfill_inflate_totals` and the following SQL. It is wrapped in a DO block for atomicity (a single migration is implicitly transactional in Supabase, but we use explicit locking to be safe).

```sql
DO $$
DECLARE
    v_inflated_users INTEGER := 0;
    v_total_delta_pts BIGINT := 0;
    v_total_delta_xp BIGINT := 0;
    r RECORD;
BEGIN
    -- Build the inflation plan into a temp table for atomicity and audit
    CREATE TEMP TABLE v5_inflation_plan ON COMMIT DROP AS
    WITH current_team_size AS (
      SELECT tm.user_id, t.member_count
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      WHERE tm.left_at IS NULL AND t.status = 'active'
    ),
    hist AS (
      SELECT tx.user_id,
             SUM(tx.points_change) AS hist_team_pts,
             SUM(tx.xp_change) AS hist_team_xp,
             COUNT(*) AS hist_team_task_count
      FROM transactions tx
      WHERE tx.type = 'task' AND tx.points_type = 'team'
      GROUP BY tx.user_id
    )
    SELECT
      u.id AS user_id,
      COALESCE(cts.member_count, 0) AS current_team_size,
      COALESCE(public.get_v5_upmark_factor(COALESCE(cts.member_count, 1)) - 1, 0) AS inflation_factor,
      COALESCE(h.hist_team_pts, 0) AS hist_team_pts,
      COALESCE(h.hist_team_xp, 0) AS hist_team_xp,
      COALESCE(h.hist_team_task_count, 0) AS hist_team_task_count,
      ROUND(COALESCE(h.hist_team_pts, 0) * (public.get_v5_upmark_factor(COALESCE(cts.member_count, 1)) - 1))::integer AS delta_pts,
      ROUND(COALESCE(h.hist_team_xp, 0) * (public.get_v5_upmark_factor(COALESCE(cts.member_count, 1)) - 1))::integer AS delta_xp
    FROM users u
    LEFT JOIN current_team_size cts ON cts.user_id = u.id
    LEFT JOIN hist h ON h.user_id = u.id
    WHERE u.status = 'active';

    -- Safety: bail out if any delta_pts violates the transactions check constraint upper bound
    IF EXISTS (
        SELECT 1 FROM v5_inflation_plan WHERE delta_pts > 50000 OR delta_xp > 50000
    ) THEN
        RAISE EXCEPTION 'V5 backfill aborted: at least one user delta exceeds 50000 (transactions.points_change upper bound). Manual review required.';
    END IF;

    -- Apply: one admin_grant transaction per inflated user, plus update users totals
    FOR r IN
        SELECT * FROM v5_inflation_plan WHERE delta_pts > 0 OR delta_xp > 0
    LOOP
        UPDATE users
        SET total_points = total_points + r.delta_pts,
            total_xp = total_xp + r.delta_xp,
            updated_at = NOW()
        WHERE id = r.user_id;

        INSERT INTO transactions (
            user_id,
            type,
            xp_change,
            points_change,
            points_type,
            description,
            activity_type,
            metadata,
            created_at
        ) VALUES (
            r.user_id,
            'admin_grant',
            r.delta_xp,
            r.delta_pts,
            'team',
            'V5 distribution rebalance (current team size: ' || r.current_team_size || ')',
            'team',
            json_build_object(
                'rebalance_version', 'v5',
                'rebalance_date', NOW(),
                'current_team_size', r.current_team_size,
                'inflation_factor', r.inflation_factor,
                'historical_team_pts', r.hist_team_pts,
                'historical_team_xp', r.hist_team_xp,
                'historical_team_task_count', r.hist_team_task_count,
                'delta_pts', r.delta_pts,
                'delta_xp', r.delta_xp
            ),
            NOW()
        );

        v_inflated_users := v_inflated_users + 1;
        v_total_delta_pts := v_total_delta_pts + r.delta_pts;
        v_total_delta_xp := v_total_delta_xp + r.delta_xp;
    END LOOP;

    RAISE NOTICE 'V5 backfill complete: inflated_users=%, total_delta_pts=%, total_delta_xp=%',
        v_inflated_users, v_total_delta_pts, v_total_delta_xp;
END;
$$;
```

- [ ] **Step 2: Verify the backfill ran**

```sql
select
  count(*) as inflation_grants,
  sum(points_change) as total_pts_added,
  sum(xp_change) as total_xp_added,
  min(created_at) as first_grant,
  max(created_at) as last_grant
from transactions
where type = 'admin_grant'
  and description like 'V5 distribution rebalance%';
```

Expected: `inflation_grants` matches the number of non-zero-delta users from the dry-run, totals match dry-run aggregates.

---

### Task 8: Verification

**Files:** none

- [ ] **Step 1: Reconcile users.total_points against transactions**

```sql
with sums as (
  select user_id, sum(points_change) as derived_pts, sum(xp_change) as derived_xp
  from transactions
  group by user_id
)
select u.id, u.name, u.total_points, s.derived_pts,
       (u.total_points - s.derived_pts) as pts_diff,
       u.total_xp, s.derived_xp,
       (u.total_xp - s.derived_xp) as xp_diff
from users u
join sums s on s.user_id = u.id
where u.status = 'active'
  and (u.total_points - s.derived_pts) <> 500  -- 500 is the default seed for total_points
order by abs(u.total_points - s.derived_pts) desc
limit 25;
```

Expected: empty result OR only the +500 default-seed offset for users; no other unexpected drift. (The `total_points` column has `default 500`, so users get a +500 head start that isn't in transactions — that's a pre-existing condition, not a V5 issue.)

- [ ] **Step 2: Spot-check 3 specific users**

For each of: a known duo member (e.g. Gints from `bettermind.now`), a known quad member (e.g. Martins from `WebGlazer`), and a known solo (e.g. Agnese from `CyberEd`):

```sql
select id, name, total_points, total_xp from users where name in ('Gints Turlajs','Martins Mozga','Agnese Misāne');

select user_id, points_change, xp_change, metadata
from transactions
where type='admin_grant'
  and description like 'V5 distribution rebalance%'
  and user_id in (
    select id from users where name in ('Gints Turlajs','Martins Mozga','Agnese Misāne')
  );
```

Expected:
- Agnese (solo): no admin_grant row, totals unchanged from snapshot.
- Gints: admin_grant with factor 0.30 and matching delta.
- Martins: admin_grant with factor 0.70 and matching delta.

- [ ] **Step 3: Verify the new top-10 leaderboard**

```sql
select name, total_points,
       (select t.name from teams t join team_members tm on tm.team_id=t.id
        where tm.user_id = u.id and tm.left_at is null limit 1) as team,
       (select t.member_count from teams t join team_members tm on tm.team_id=t.id
        where tm.user_id = u.id and tm.left_at is null limit 1) as team_size
from users u
where u.status='active' and u.primary_role='user'
order by total_points desc
limit 10;
```

Expected: Agnese stays #1, Gints (duo) jumps near #2, WebGlazer quad members enter top 10. Matches the V5 simulation done during analysis.

- [ ] **Step 4: Append verification results to snapshot doc and commit**

```bash
git add docs/superpowers/plans/2026-05-18-v5-points-distribution.snapshot.md
git commit -m "docs: V5 post-backfill verification snapshot"
```

---

### Task 9: Regenerate database types

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Regenerate**

```bash
npx supabase gen types typescript --project-id ksoohvygoysofvtqdumz > src/types/database.ts
```

- [ ] **Step 2: Run typecheck and lint**

```bash
npm run build
npm run lint
```

Expected: build succeeds, no new lint errors. (The new RPC `distribute_team_rewards_v2` and helper `get_v5_upmark_factor` are not yet called from TS code — they're DB-internal — so no callers need updating.)

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "chore: regenerate database types for V5 RPCs"
```

---

### Task 10: Smoke test on develop preview

**Files:** none

- [ ] **Step 1: Push to develop and wait for Vercel preview**

```bash
git push origin develop
```

Then wait for Vercel preview deployment to complete (visible in the GitHub commit status or Vercel dashboard).

- [ ] **Step 2: Open the develop preview and check three pages**

1. `/dashboard/leaderboard` — confirm a multi-member team's member is now near the top alongside the solos.
2. `/dashboard/transaction-history` — for a user that was inflated, confirm one `admin_grant` row labeled "V5 distribution rebalance" is visible with the correct delta and metadata.
3. `/dashboard/team-journey/[id]` — open a real team page, approve a new team task as another member, confirm the new transaction has `distribution_version=v2` and points-per-member matches the V5 formula.

- [ ] **Step 3: Check for unexpected errors in browser console and Vercel runtime logs**

Open browser DevTools console while navigating the three pages above. Check Vercel runtime logs for any 500s or PostgreSQL errors related to the new functions.

---

### Task 11: Merge to master

**Files:** none

- [ ] **Step 1: Verify develop preview is healthy**

After at least 30 minutes of develop preview running with no errors and at least one real peer-review approval that used the V2 distributor, proceed.

- [ ] **Step 2: Take a fresh Supabase backup (master push will not change schema again, but belt and suspenders)**

Same as Task 0 Step 2.

- [ ] **Step 3: Push develop branch to master**

Per CLAUDE.md safe push pattern:

```bash
git push origin develop:master
```

- [ ] **Step 4: Monitor production**

Watch `/dashboard/leaderboard` and Vercel logs for 30 minutes. Approve at least one production team task to confirm the V2 flow works on master.

---

### Task 12: Document rollback procedure

**Files:**
- Create: `docs/superpowers/plans/2026-05-18-v5-points-distribution.rollback.md`

- [ ] **Step 1: Write the rollback doc**

```markdown
# V5 Rollback Procedure

If V5 distribution causes a regression and we need to revert:

## A) Stop the V5 distributor (fast rollback, keeps history intact)

Apply a migration that points `submit_external_peer_review` back at the original `distribute_team_rewards`:

1. Edit the function body — change the single line `SELECT distribute_team_rewards_v2(...)` back to `SELECT distribute_team_rewards(...)`.
2. Apply via `mcp__supabase__apply_migration` with name `v5_rollback_to_v1`.
3. New approvals after this point will use V1 (split-only, no upmark) again.

The historical V5 transactions stay in place — only future approvals revert.

## B) Undo the inflation grants (full undo)

To remove the one-shot inflation:

```sql
-- BACK UP FIRST, then:
with grants as (
  select id, user_id, points_change, xp_change
  from transactions
  where type='admin_grant' and description like 'V5 distribution rebalance%'
)
update users u
set total_points = total_points - g.points_change,
    total_xp = total_xp - g.xp_change,
    updated_at = now()
from grants g
where g.user_id = u.id;

delete from transactions
where type='admin_grant' and description like 'V5 distribution rebalance%';
```

## C) Verify rollback

Re-run the reconcile query from Task 8 Step 1. The `pts_diff` column should be back to the pre-V5 baseline of +500 (default seed) for every user.

## D) Drop V2 RPCs (optional, only after confirming rollback A+B are stable)

```sql
DROP FUNCTION public.distribute_team_rewards_v2(uuid, integer, integer, uuid, text, uuid, uuid);
DROP FUNCTION public.get_v5_upmark_factor(integer);
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-05-18-v5-points-distribution.rollback.md
git commit -m "docs: V5 rollback procedure"
```

---

## Notes & Risks

- **Transactions check constraint** (`points_change >= -10000 AND points_change <= 50000`): largest expected delta is around 3500. Safe.
- **Trigger `validate_transaction_legitimacy`**: only rejects fraudulent "Peer review completed" rows and team-task rows with wrong descriptions. Allows `admin_grant` rows freely.
- **`teams.team_points`** column: unused by any current function; not touched by V5.
- **Achievement trigger** (`trigger_check_achievement_on_approval`): fires on task_progress UPDATE to `approved`. V2 distributor doesn't change task_progress status (the caller `submit_external_peer_review` does), so trigger behavior is unchanged.
- **Backup functions** (`submit_external_peer_review_backup_v2/v3`, `distribute_team_rewards`): kept untouched; not callable from frontend; preserved for rollback per CLAUDE.md V2 pattern.
- **No frontend code change required**: leaderboard, transaction history, dashboards all read `users.total_points` and `transactions` directly.
- **Develop and master share the same Supabase DB**: per CLAUDE.md. The migration applies once to the shared DB; the only branch-specific concern is the frontend code (types). Make sure to push develop and wait for preview before merging to master.

## Self-Review Checklist (executed by author of this plan)

- [x] All spec requirements covered: V5 distribution for future tasks (Tasks 2-5), inflation by current team size (Tasks 6-8), no changes to achievements/meetings/individual tasks (omitted from scope by design)
- [x] No placeholders — every step contains actual SQL/TS/bash that can be executed verbatim
- [x] Type consistency — function names (`get_v5_upmark_factor`, `distribute_team_rewards_v2`), parameter names, metadata field names match across tasks
- [x] Rollback is documented (Task 12)
- [x] Tests cover sizes 1/2/3/4 plus tx metadata and empty-team error path
- [x] Verification step reconciles `users.total_points` against `transactions` sums
