# Admin Panel Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the admin panel from a Batch 2 Team Journey cockpit into a small, phase-aware panel grouped by admin job (Curriculum / People / Team Journey / System), with correct numbers and no dead UI.

**Architecture:** Keep every working table/dialog; change the shell around them. The overview is rebuilt as three sections gated by the Programme Phase toggles and fed by one slimmed `/api/admin/stats` call. Two new read-only RPCs fix the two number bugs (archived students counted as "at risk"; `task_progress` capped at 1000 rows). Settings move to their own page. Progress page, Roles & Permissions stub, Download Template stubs, AI Analysis placeholder, `page-old.tsx` and the v1 audit formatter are deleted. Agreements + Laptops & Keycards merge into one page with two tabs. Sidebar gets section labels and the two orphaned pages (Tasks, Activity Log).

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, ShadCN (Tabs, Card, Select), Supabase (plpgsql RPCs via MCP `apply_migration`), Vitest.

**Spec:** This document is the spec (decisions recorded in the design section below). Findings that motivated it: overview "70 At Risk" counts 69 archived Batch 2 students (RPC `get_admin_program_health_v2` has no `users.status` filter); overview "1000 task assignments" is Supabase's default row cap (real 1844); Team Journey is off yet ~80 % of the panel is Team Journey; sidebar (10 items) and overview quick-links (7) disagree; Tasks and Audit Logs are not in the sidebar at all.

## Global Constraints

- Prettier: `printWidth: 80`, double quotes, `trailingComma: "es5"`; ESLint via lint-staged on commit. Do not fight the formatter.
- Files under ~200 lines. Split before exceeding.
- ShadCN components from `src/components/ui/` for all standard UI.
- Never `alert()`/`confirm()`; Sonner toast or inline errors.
- Client pages guard with `useApp()` + `redirect("/dashboard")` when `user.primary_role !== "admin"`; API routes verify admin from the `users` table.
- Database: additive only. New functions get new names (`_v3`, `_v1`); existing functions untouched. Migration applied via Supabase MCP `apply_migration` AND mirrored as `supabase/migrations/<timestamp>_<name>.sql`. Project id `ksoohvygoysofvtqdumz`. Take a manual Supabase backup before applying.
- Every RPC called with `adminClient` (service_role) — `REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role`.
- No `git checkout`. Branch with `git switch -c`. Work on `feature/admin-panel-restructure` from `develop` (HEAD `fe39318` == origin/develop == origin/master at plan time). Commit per task; do not push until the user says so.
- Copy rule: English only. No programme durations in copy.
- Do not touch Vercel; the user watches deploys himself.

---

## Design (the spec)

### Sidebar — Admin sub-items, in order, with section labels

| Section | Item | URL | Notes |
|---|---|---|---|
| — | (parent "Admin" links to overview) | `/dashboard/admin` | |
| Curriculum | Tasks | `/dashboard/admin/tasks` | new to sidebar |
| Curriculum | AI Reviews | `/dashboard/admin/ai-reviews` | |
| Curriculum | Peer Reviews | `/dashboard/admin/peer-reviews` | |
| People | Users | `/dashboard/admin/users` | tabs: Users / Invitations |
| People | Agreements | `/dashboard/admin/agreements` | tabs: Scholarships / Equipment |
| People | Diplomas | `/dashboard/admin/diplomas` | unchanged (Setup tab holds batches) |
| Team Journey | Teams | `/dashboard/admin/teams` | label reads "Team Journey · paused" when toggle off |
| Team Journey | Weekly Reports | `/dashboard/admin/weekly-reports` | |
| Team Journey | Analytics | `/dashboard/admin/analytics` | |
| System | Activity Log | `/dashboard/admin/audit-logs` | new to sidebar |
| System | Settings | `/dashboard/admin/settings` | new page |

Removed from sidebar and from the codebase: **Progress**, **Laptops & Keycards** (route kept as a redirect to `/dashboard/admin/agreements?tab=equipment`).

### Overview (`/dashboard/admin`) — phase-aware

Data: one `GET /api/admin/stats` returning `{ programHealth, taskPipeline, aiReview, teamXp, weeklyTrends }`. Rendered top to bottom:

1. **Students** — `HealthSnapshot` students card only (Active / Slowing / At Risk from `get_admin_program_health_v3`, which counts only `users.status = 'active'`). "View all" → `/dashboard/admin/users`. Tier rows are no longer links (Progress is gone).
2. **My Journey** (when `myJourney` on) — `AiReviewsSummary` (Reviewed today / Approval rate / Failures / Spend) + `TaskPipelineCard` for `activity_type = 'individual'`. Header link → `/dashboard/admin/ai-reviews`.
3. **Team Journey** (when `teamJourney` on) — `HealthSnapshot` teams card, `ProgramHealthCards`, `NeedsAttentionFeed`, `WeeklyTrendsChart`, `TaskPipelineCard` for `activity_type = 'team'`, `AdminCharts`. Exactly the current components, only shown when the phase is on.
4. Both off → a single muted card: "Both journeys are paused. Turn one on in Settings." linking to `/dashboard/admin/settings`.

Removed from overview: Programme Phase card, AI Task Reviewer card (→ Settings), `TaskStatusChart` pie (→ `TaskPipelineCard`), `QuickNav` grid (sidebar now complete).

### Settings (`/dashboard/admin/settings`) — new

`ProgrammePhaseCard` + `AiReviewSettingsCard`, nothing else.

### Users — tabs `Users` / `Invitations`

Roles & Permissions stub removed. `AdminUsersTable` default filter `"active"` (was `"all"`, which opened on 69 archived rows).

### Agreements — tabs `Scholarships` / `Equipment`

Both tabs render the existing `AgreementsQueue` with `embedded` so the page owns the H2. Laptops & Keycards page becomes a redirect.

### Tasks

Two disabled "Download Template" buttons removed. Default tab follows the phase: `individual-tasks` when Team Journey is off, `team-tasks` otherwise.

### Analytics

`AiPlaceholderCard` ("AI Analysis — Coming soon") removed from the Overview tab and from the student/team detail dialogs; the component is deleted.

### Deleted

`src/app/dashboard/admin/progress/` (page), `src/components/admin/team-detail-modal.tsx`, `src/components/admin/student-progress-alerts.tsx`, `src/components/admin/task-status-chart.tsx`, `src/app/dashboard/admin/audit-logs/page-old.tsx`, `src/lib/audit-log-formatter.ts`, `src/app/dashboard/admin/laptops-keycards/page.tsx` body (replaced by redirect).

### Activity Log

Gets the standard admin guard and page shell (`p-4 pt-6 md:p-8`, `h2.text-3xl`). Everything else unchanged.

### Database (one migration, additive)

- `get_admin_program_health_v3()` — same columns as v2; every student aggregate additionally requires `u.status = 'active'`. Team aggregates unchanged.
- `get_admin_task_pipeline_v1()` — `TABLE(activity_type text, status text, count bigint)` from `task_progress ⋈ tasks`, excluding rows whose user or team is not `active`.

---

### Task 1: Branch, backup, migration for the two new RPCs

**Files:**
- Create: `supabase/migrations/20260911120000_admin_overview_rpcs_v1.sql`
- Test: `tests/admin/overview-rpcs.test.ts`
- Modify: `CLAUDE.md` (Rollback Reference section — add an entry)

**Interfaces:**
- Produces: `public.get_admin_program_health_v3()` returning the same 22 columns as `get_admin_program_health_v2()`; `public.get_admin_task_pipeline_v1()` returning `TABLE(activity_type text, status text, count bigint)`. Both `SECURITY DEFINER`, EXECUTE granted to `service_role` only.

- [ ] **Step 1: Create the branch**

```bash
git switch -c feature/admin-panel-restructure
```
Expected: `Switched to a new branch 'feature/admin-panel-restructure'`.

- [ ] **Step 2: Verify column names the RPC will use (Supabase MCP `execute_sql`)**

```sql
select table_name, column_name, data_type from information_schema.columns
where table_schema='public' and table_name in ('task_progress','tasks','users','teams')
  and column_name in ('task_id','user_id','team_id','status','activity_type')
order by table_name, column_name;
```
Expected: `task_progress` has `task_id`, `user_id`, `team_id`, `status`; `tasks` has `activity_type`; `users.status` and `teams.status` exist. If any is missing, stop and adjust the SQL below before applying.

- [ ] **Step 3: Write the failing test**

`tests/admin/overview-rpcs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Read-only checks against prod RPCs. No rows are written.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe("admin overview RPCs", () => {
  it("get_admin_program_health_v3 counts only active students", async () => {
    const { data, error } = await admin.rpc("get_admin_program_health_v3");
    expect(error).toBeNull();
    const row = (data as Record<string, number>[])[0];

    const { count } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("primary_role", "user")
      .eq("status", "active");

    expect(Number(row.total_students)).toBe(count);
    expect(
      Number(row.students_active) +
        Number(row.students_slowing) +
        Number(row.students_at_risk)
    ).toBeLessThanOrEqual(count ?? 0);
  });

  it("get_admin_task_pipeline_v1 is not capped at 1000 rows", async () => {
    const { data, error } = await admin.rpc("get_admin_task_pipeline_v1");
    expect(error).toBeNull();
    const rows = data as { activity_type: string; status: string; count: number }[];
    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

    const { count } = await admin
      .from("task_progress")
      .select("id", { count: "exact", head: true });

    // Pipeline excludes archived users/teams, so it can be lower, never higher.
    expect(total).toBeLessThanOrEqual(count ?? 0);
    expect(total).toBeGreaterThan(1000);
    for (const r of rows) {
      expect(["individual", "team"]).toContain(r.activity_type);
    }
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/admin/overview-rpcs.test.ts`
Expected: FAIL — `error` is not null (function `get_admin_program_health_v3` does not exist).

- [ ] **Step 5: Take a manual Supabase backup** (Dashboard → Database → Backups → "Create backup"). Function-only migration, but the protocol says always.

- [ ] **Step 6: Write the migration file**

`supabase/migrations/20260911120000_admin_overview_rpcs_v1.sql`:

```sql
-- Admin overview RPCs (2026-09-11). Purely additive.
--   get_admin_program_health_v3 : v2 + users.status = 'active' on every
--                                 student aggregate (v2 counted the 69
--                                 archived Batch 2 students as "at risk").
--   get_admin_task_pipeline_v1  : task_progress counts grouped by
--                                 tasks.activity_type + status, done in SQL
--                                 (the route used to select every row and
--                                 hit the 1000-row default cap).

CREATE OR REPLACE FUNCTION public.get_admin_program_health_v3()
RETURNS TABLE(
  total_students bigint, active_7d bigint, active_14d bigint,
  at_risk_students bigint, reports_this_week bigint, reports_last_week bigint,
  tasks_this_week bigint, tasks_last_week bigint, pending_strikes bigint,
  pending_reviews bigint, avg_xp_per_student numeric, total_active_teams bigint,
  students_active bigint, students_slowing bigint, students_at_risk bigint,
  teams_active bigint, teams_slowing bigint, teams_at_risk bigint,
  students_active_wow_delta bigint, students_at_risk_wow_delta bigint,
  teams_active_wow_delta bigint, teams_at_risk_wow_delta bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_current_week int := EXTRACT(WEEK FROM now())::int;
  v_current_year int := EXTRACT(YEAR FROM now())::int;
  v_last_week int := EXTRACT(WEEK FROM now())::int - 1;
  v_students_active bigint; v_students_slowing bigint; v_students_at_risk bigint;
  v_teams_active bigint; v_teams_slowing bigint; v_teams_at_risk bigint;
  v_students_active_prev bigint; v_students_at_risk_prev bigint;
  v_teams_active_prev bigint; v_teams_at_risk_prev bigint;
BEGIN
  WITH s AS (
    SELECT u.id,
      GREATEST(
        COALESCE(au.last_sign_in_at, '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(t.created_at) FROM transactions t
                  WHERE t.user_id = u.id AND t.type IN ('task','validation','meeting')),
                 '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(wr.submitted_at) FROM weekly_reports wr WHERE wr.user_id = u.id),
                 '1970-01-01'::timestamptz)
      ) AS last_active
    FROM users u
    LEFT JOIN auth.users au ON au.id = u.id
    WHERE u.primary_role = 'user'
      AND u.status = 'active'
      AND (
        NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id AND tm.left_at IS NULL)
        OR EXISTS (SELECT 1 FROM team_members tm JOIN teams tmt ON tmt.id = tm.team_id
                   WHERE tm.user_id = u.id AND tm.left_at IS NULL AND tmt.name NOT ILIKE '[TEST]%')
      )
  )
  SELECT
    COUNT(*) FILTER (WHERE last_active > now() - interval '7 days'),
    COUNT(*) FILTER (WHERE last_active <= now() - interval '7 days' AND last_active > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_active <= now() - interval '14 days')
  INTO v_students_active, v_students_slowing, v_students_at_risk FROM s;

  WITH tg AS (
    SELECT tm.id,
      COALESCE((SELECT MAX(tr.created_at) FROM transactions tr
                WHERE tr.team_id = tm.id AND tr.type IN ('task','validation','meeting')),
               '1970-01-01'::timestamptz) AS last_xp
    FROM teams tm WHERE tm.status = 'active' AND tm.name NOT ILIKE '[TEST]%'
  )
  SELECT
    COUNT(*) FILTER (WHERE last_xp > now() - interval '7 days'),
    COUNT(*) FILTER (WHERE last_xp <= now() - interval '7 days' AND last_xp > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_xp <= now() - interval '14 days')
  INTO v_teams_active, v_teams_slowing, v_teams_at_risk FROM tg;

  WITH s_prev AS (
    SELECT u.id,
      GREATEST(
        COALESCE(CASE WHEN au.last_sign_in_at <= now() - interval '7 days' THEN au.last_sign_in_at END,
                 '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(t.created_at) FROM transactions t
                  WHERE t.user_id = u.id AND t.type IN ('task','validation','meeting')
                    AND t.created_at <= now() - interval '7 days'),
                 '1970-01-01'::timestamptz),
        COALESCE((SELECT MAX(wr.submitted_at) FROM weekly_reports wr
                  WHERE wr.user_id = u.id AND wr.submitted_at <= now() - interval '7 days'),
                 '1970-01-01'::timestamptz)
      ) AS last_active
    FROM users u
    LEFT JOIN auth.users au ON au.id = u.id
    WHERE u.primary_role = 'user'
      AND u.status = 'active'
      AND u.created_at <= now() - interval '7 days'
      AND (
        NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = u.id AND tm.left_at IS NULL)
        OR EXISTS (SELECT 1 FROM team_members tm JOIN teams tmt ON tmt.id = tm.team_id
                   WHERE tm.user_id = u.id AND tm.left_at IS NULL AND tmt.name NOT ILIKE '[TEST]%')
      )
  )
  SELECT
    COUNT(*) FILTER (WHERE last_active > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_active <= now() - interval '21 days')
  INTO v_students_active_prev, v_students_at_risk_prev FROM s_prev;

  WITH tg_prev AS (
    SELECT tm.id,
      COALESCE((SELECT MAX(tr.created_at) FROM transactions tr
                WHERE tr.team_id = tm.id AND tr.type IN ('task','validation','meeting')
                  AND tr.created_at <= now() - interval '7 days'),
               '1970-01-01'::timestamptz) AS last_xp
    FROM teams tm
    WHERE tm.status = 'active' AND tm.name NOT ILIKE '[TEST]%'
      AND tm.created_at <= now() - interval '7 days'
  )
  SELECT
    COUNT(*) FILTER (WHERE last_xp > now() - interval '14 days'),
    COUNT(*) FILTER (WHERE last_xp <= now() - interval '21 days')
  INTO v_teams_active_prev, v_teams_at_risk_prev FROM tg_prev;

  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM users WHERE primary_role = 'user' AND status = 'active')::bigint,
    (SELECT COUNT(DISTINCT t.user_id) FROM transactions t
       JOIN users u ON u.id = t.user_id AND u.primary_role = 'user' AND u.status = 'active'
      WHERE t.created_at > now() - interval '7 days' AND t.type IN ('task','validation','meeting'))::bigint,
    (SELECT COUNT(DISTINCT t.user_id) FROM transactions t
       JOIN users u ON u.id = t.user_id AND u.primary_role = 'user' AND u.status = 'active'
      WHERE t.created_at > now() - interval '14 days' AND t.type IN ('task','validation','meeting'))::bigint,
    (SELECT COUNT(*) FROM users u
      WHERE u.primary_role = 'user' AND u.status = 'active'
        AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.id
                          AND t.created_at > now() - interval '14 days'
                          AND t.type IN ('task','validation','meeting')))::bigint,
    (SELECT COUNT(DISTINCT wr.user_id) FROM weekly_reports wr
       JOIN users u ON u.id = wr.user_id AND u.status = 'active'
      WHERE wr.week_number = v_current_week AND wr.week_year = v_current_year)::bigint,
    (SELECT COUNT(DISTINCT wr.user_id) FROM weekly_reports wr
       JOIN users u ON u.id = wr.user_id AND u.status = 'active'
      WHERE wr.week_number = v_last_week AND wr.week_year = v_current_year)::bigint,
    (SELECT COUNT(*) FROM task_progress WHERE status = 'approved'
       AND completed_at > now() - interval '7 days')::bigint,
    (SELECT COUNT(*) FROM task_progress WHERE status = 'approved'
       AND completed_at BETWEEN (now() - interval '14 days') AND (now() - interval '7 days'))::bigint,
    (SELECT COUNT(*) FROM team_strikes WHERE status = 'pending')::bigint,
    (SELECT COUNT(*) FROM task_progress WHERE status = 'pending_review')::bigint,
    (SELECT ROUND(AVG(total_xp)::numeric, 0) FROM users
      WHERE primary_role = 'user' AND status = 'active' AND total_xp > 0),
    (SELECT COUNT(*) FROM teams WHERE status = 'active' AND name NOT ILIKE '[TEST]%')::bigint,
    v_students_active, v_students_slowing, v_students_at_risk,
    v_teams_active, v_teams_slowing, v_teams_at_risk,
    (v_students_active - v_students_active_prev),
    (v_students_at_risk - v_students_at_risk_prev),
    (v_teams_active - v_teams_active_prev),
    (v_teams_at_risk - v_teams_at_risk_prev);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_program_health_v3() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_program_health_v3() TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_task_pipeline_v1()
RETURNS TABLE(activity_type text, status text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT t.activity_type::text, tp.status::text, COUNT(*)::bigint
  FROM task_progress tp
  JOIN tasks t ON t.id = tp.task_id
  LEFT JOIN users u ON u.id = tp.user_id
  LEFT JOIN teams tm ON tm.id = tp.team_id
  WHERE COALESCE(u.status::text, 'active') = 'active'
    AND COALESCE(tm.status::text, 'active') = 'active'
  GROUP BY 1, 2;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_task_pipeline_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_task_pipeline_v1() TO service_role;
```

- [ ] **Step 7: Apply via Supabase MCP `apply_migration`** with `name: "admin_overview_rpcs_v1"` and the file body as `query`.

- [ ] **Step 8: Sanity-check the numbers (execute_sql)**

```sql
select total_students, students_active, students_slowing, students_at_risk, reports_this_week
from get_admin_program_health_v3();
select * from get_admin_task_pipeline_v1() order by 1,2;
```
Expected: `total_students` = 7 minus admins (only active `primary_role='user'` rows, i.e. small single digits, NOT 71); pipeline sum > 1000 and every `activity_type` is `individual` or `team`.

- [ ] **Step 9: Run the test**

Run: `npx vitest run tests/admin/overview-rpcs.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 10: Add rollback entry to `CLAUDE.md`** under "Rollback Reference", above the 2026-09-10 entry:

```markdown
### 2026-09-11 — Admin overview RPCs (migration: `admin_overview_rpcs_v1`; repo file `20260911120000_admin_overview_rpcs_v1.sql`)

**What it added:** `get_admin_program_health_v3()` (v2 + `users.status = 'active'` on every student aggregate — v2 counted the 69 archived Batch 2 students as "At Risk" / "missing reports") and `get_admin_task_pipeline_v1()` (task_progress counts by `tasks.activity_type` + status, excluding archived users/teams — replaces a route query that hit the 1000-row cap). Both SECURITY DEFINER, EXECUTE service_role only. Purely additive; v2 untouched. Consumer: `/api/admin/stats`.

**Rollback:** `DROP FUNCTION public.get_admin_program_health_v3(); DROP FUNCTION public.get_admin_task_pipeline_v1();` after pointing `src/app/api/admin/stats/route.ts` back at `get_admin_program_health_v2` and the old `task_progress` select (git history).
```

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/20260911120000_admin_overview_rpcs_v1.sql tests/admin/overview-rpcs.test.ts CLAUDE.md
git commit -m "feat(admin): program health v3 (active students only) + task pipeline RPC"
```

---

### Task 2: Slim `/api/admin/stats` and type its response

**Files:**
- Create: `src/types/admin-stats.ts`
- Modify: `src/app/api/admin/stats/route.ts` (whole body of the `Promise.all` and the response)

**Interfaces:**
- Consumes: RPCs from Task 1, `get_ai_review_admin_summary_v1`, `get_admin_weekly_trends`, `get_top_teams_with_xp`.
- Produces: `AdminStats` type (below) as the JSON body of `GET /api/admin/stats`.

- [ ] **Step 1: Create the type file**

`src/types/admin-stats.ts`:

```ts
import type { AiReviewAdminSummary } from "@/types/ai-review-admin";

export interface ProgramHealth {
  total_students: number;
  active_7d: number;
  active_14d: number;
  at_risk_students: number;
  reports_this_week: number;
  reports_last_week: number;
  tasks_this_week: number;
  tasks_last_week: number;
  pending_strikes: number;
  pending_reviews: number;
  avg_xp_per_student: number;
  total_active_teams: number;
  students_active: number;
  students_slowing: number;
  students_at_risk: number;
  teams_active: number;
  teams_slowing: number;
  teams_at_risk: number;
  students_active_wow_delta: number;
  students_at_risk_wow_delta: number;
  teams_active_wow_delta: number;
  teams_at_risk_wow_delta: number;
}

export interface TaskPipelineRow {
  activity_type: "individual" | "team";
  status: string;
  count: number;
}

export interface TeamRanking {
  id: string;
  name: string;
  team_points: number;
  total_xp?: number;
}

export interface WeeklyTrend {
  week_number: number;
  week_year: number;
  week_label: string;
  report_submissions: number;
  tasks_completed: number;
  active_students: number;
}

export interface AdminStats {
  programHealth: ProgramHealth | null;
  taskPipeline: TaskPipelineRow[];
  aiReview: AiReviewAdminSummary | null;
  teamXp: TeamRanking[];
  weeklyTrends: WeeklyTrend[];
}
```

- [ ] **Step 2: Rewrite the data section of the route**

Replace everything from `const adminClient = createAdminClient();` to the end of the `try` block in `src/app/api/admin/stats/route.ts` with:

```ts
    const adminClient = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpc = adminClient.rpc as any;

    const [programHealth, taskPipeline, aiReview, teamXp, weeklyTrends] =
      await Promise.all([
        rpc("get_admin_program_health_v3").then(
          (res: { data: ProgramHealth[] | null }) => res.data?.[0] ?? null
        ),
        rpc("get_admin_task_pipeline_v1").then(
          (res: { data: TaskPipelineRow[] | null }) =>
            (res.data ?? []).map((r) => ({ ...r, count: Number(r.count) }))
        ),
        rpc("get_ai_review_admin_summary_v1").then(
          (res: { data: Partial<AiReviewAdminSummary> | null }) =>
            res.data
              ? {
                  today: Number(res.data.today ?? 0),
                  approval_rate: Number(res.data.approval_rate ?? 0),
                  reject_reasons: res.data.reject_reasons ?? {},
                  failures: Number(res.data.failures ?? 0),
                  cost_usd: Number(res.data.cost_usd ?? 0),
                }
              : null
        ),
        adminClient
          .rpc("get_top_teams_with_xp", { team_limit: 10 })
          .then((res) => (res.data ?? []) as TeamRanking[]),
        rpc("get_admin_weekly_trends").then(
          (res: { data: WeeklyTrend[] | null }) => res.data ?? []
        ),
      ]);

    const body: AdminStats = {
      programHealth,
      taskPipeline,
      aiReview,
      teamXp,
      weeklyTrends,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    });
```

Add imports at the top:

```ts
import type {
  AdminStats,
  ProgramHealth,
  TaskPipelineRow,
  TeamRanking,
  WeeklyTrend,
} from "@/types/admin-stats";
import type { AiReviewAdminSummary } from "@/types/ai-review-admin";
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "stats/route|admin-overview" || echo "no errors in touched files"`
Expected: `admin-overview.tsx` errors are acceptable here (it still expects the old shape; Task 3 fixes it). `stats/route.ts` must have none.

- [ ] **Step 4: Commit**

```bash
git add src/types/admin-stats.ts src/app/api/admin/stats/route.ts
git commit -m "refactor(admin): stats route returns only what the overview renders"
```

---

### Task 3: Phase-aware overview

**Files:**
- Create: `src/components/admin/overview/task-pipeline-card.tsx`
- Create: `src/components/admin/overview/my-journey-section.tsx`
- Create: `src/components/admin/overview/team-journey-section.tsx`
- Create: `src/components/admin/overview/paused-card.tsx`
- Modify: `src/components/admin/admin-overview.tsx` (rewrite, ≤ 120 lines)
- Modify: `src/components/admin/health-snapshot.tsx` (optional props, no Progress links)
- Delete: `src/components/admin/task-status-chart.tsx`

**Interfaces:**
- Consumes: `AdminStats` from Task 2; `usePlatformSettings()` → `{ data: { myJourney, teamJourney }, isLoading }`; existing `AiReviewsSummary({ summary })`, `ProgramHealthCards({ health })`, `NeedsAttentionFeed({ health })`, `WeeklyTrendsChart({ data })`, `AdminCharts({ teamPoints, teamXp })`.
- Produces: `HealthSnapshot({ students?, teams? })` — both props optional, renders only the ones passed.

- [ ] **Step 1: Make `HealthSnapshot` props optional and drop the Progress links**

In `src/components/admin/health-snapshot.tsx`:
- Change `interface HealthSnapshotProps { students: HealthBuckets; teams: HealthBuckets; }` to `{ students?: HealthBuckets; teams?: HealthBuckets; }`.
- Where the two cards are rendered, wrap each in `{students && (...)}` / `{teams && (...)}` and keep the outer grid `md:grid-cols-2` only when both are present (`className={cn("grid gap-4", students && teams && "md:grid-cols-2")}`).
- Replace the tier-row `onClick` (line ~105, `router.push(\`/dashboard/admin/progress?filter=...\`)`) with nothing: remove `onClick`, `role="button"` and `cursor-pointer` from the row; remove the trailing arrow icon.
- Replace the "View all" `onClick` (line ~120) with `router.push(scope === "students" ? "/dashboard/admin/users" : "/dashboard/admin/teams")`.
- Remove the now-unused `useRouter` import only if no call remains (the "View all" still uses it).

- [ ] **Step 2: Create `TaskPipelineCard`**

`src/components/admin/overview/task-pipeline-card.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskPipelineRow } from "@/types/admin-stats";

const STATUS_ORDER: { key: string; label: string; bar: string }[] = [
  { key: "approved", label: "Approved", bar: "bg-emerald-500" },
  { key: "pending_review", label: "Pending review", bar: "bg-amber-500" },
  { key: "in_progress", label: "In progress", bar: "bg-primary" },
  { key: "not_started", label: "Not started", bar: "bg-muted-foreground/40" },
  { key: "rejected", label: "Rejected", bar: "bg-red-500" },
];

interface TaskPipelineCardProps {
  title: string;
  rows: TaskPipelineRow[];
  activityType: "individual" | "team";
}

export function TaskPipelineCard({
  title,
  rows,
  activityType,
}: TaskPipelineCardProps) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.activity_type !== activityType) continue;
    counts.set(r.status, (counts.get(r.status) ?? 0) + r.count);
  }
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-muted-foreground text-xs">
          {total.toLocaleString()} task assignments
        </p>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {total === 0 && (
          <p className="text-muted-foreground text-sm">No assignments yet.</p>
        )}
        {STATUS_ORDER.filter((s) => counts.has(s.key)).map((s) => {
          const n = counts.get(s.key) ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <div key={s.key} className="grid grid-cols-[7rem_1fr_5rem] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div className={`h-full ${s.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-right tabular-nums">
                {n.toLocaleString()} · {pct}%
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create `MyJourneySection`**

`src/components/admin/overview/my-journey-section.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AiReviewsSummary } from "@/components/admin/ai-reviews-summary";
import { TaskPipelineCard } from "./task-pipeline-card";
import type { AdminStats } from "@/types/admin-stats";

export function MyJourneySection({ stats }: { stats: AdminStats }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide uppercase">
          My Journey
        </h3>
        <Link
          href="/dashboard/admin/ai-reviews"
          className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
        >
          AI reviews <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <AiReviewsSummary summary={stats.aiReview} />
      <TaskPipelineCard
        title="Solo task pipeline"
        rows={stats.taskPipeline}
        activityType="individual"
      />
    </section>
  );
}
```

- [ ] **Step 4: Create `TeamJourneySection`**

`src/components/admin/overview/team-journey-section.tsx`:

```tsx
import { HealthSnapshot } from "@/components/admin/health-snapshot";
import { ProgramHealthCards } from "@/components/admin/program-health-cards";
import { NeedsAttentionFeed } from "@/components/admin/needs-attention-feed";
import { WeeklyTrendsChart } from "@/components/admin/weekly-trends-chart";
import { AdminCharts } from "@/components/admin/admin-charts";
import { TaskPipelineCard } from "./task-pipeline-card";
import type { AdminStats } from "@/types/admin-stats";

export function TeamJourneySection({ stats }: { stats: AdminStats }) {
  const h = stats.programHealth;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold tracking-wide uppercase">
        Team Journey
      </h3>
      {h && (
        <HealthSnapshot
          teams={{
            active: h.teams_active ?? 0,
            slowing: h.teams_slowing ?? 0,
            at_risk: h.teams_at_risk ?? 0,
            active_wow_delta: h.teams_active_wow_delta ?? 0,
            at_risk_wow_delta: h.teams_at_risk_wow_delta ?? 0,
          }}
        />
      )}
      {h && <ProgramHealthCards health={h} />}
      <NeedsAttentionFeed health={h} />
      <div className="grid gap-4 md:grid-cols-2">
        {stats.weeklyTrends.length > 0 && (
          <WeeklyTrendsChart data={stats.weeklyTrends} />
        )}
        <TaskPipelineCard
          title="Team task pipeline"
          rows={stats.taskPipeline}
          activityType="team"
        />
      </div>
      <AdminCharts
        teamPoints={stats.teamXp.map((t) => ({
          id: t.id,
          name: t.name,
          team_points: t.team_points,
        }))}
        teamXp={stats.teamXp}
      />
    </section>
  );
}
```

- [ ] **Step 5: Create `PausedCard`**

`src/components/admin/overview/paused-card.tsx`:

```tsx
import Link from "next/link";
import { PauseCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PausedCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <PauseCircle className="text-muted-foreground h-10 w-10" />
        <p className="font-medium">Both journeys are paused</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Nothing is being tracked for students right now. Turn a journey on
          to see its activity here.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/admin/settings">Open Settings</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Rewrite `admin-overview.tsx`**

Replace the whole file with:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import type { AdminStats } from "@/types/admin-stats";
import { HealthSnapshot } from "./health-snapshot";
import { MyJourneySection } from "./overview/my-journey-section";
import { TeamJourneySection } from "./overview/team-journey-section";
import { PausedCard } from "./overview/paused-card";

async function fetchStats(): Promise<AdminStats> {
  const res = await fetch("/api/admin/stats");
  if (!res.ok) throw new Error(`stats request failed (${res.status})`);
  return res.json();
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-3 h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminOverview() {
  const { data: journeys } = usePlatformSettings();
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchStats,
    staleTime: 30 * 1000,
  });

  if (stats.isLoading) return <OverviewSkeleton />;

  if (stats.isError || !stats.data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertTriangle className="text-muted-foreground h-10 w-10" />
          <div className="text-center">
            <p className="font-medium">Failed to load platform stats</p>
            <p className="text-muted-foreground mt-1 text-sm">
              This is usually temporary. Try again in a moment.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => stats.refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const h = stats.data.programHealth;
  const anyOn = journeys.myJourney || journeys.teamJourney;

  return (
    <div className="space-y-6">
      {h && (
        <HealthSnapshot
          students={{
            active: h.students_active ?? 0,
            slowing: h.students_slowing ?? 0,
            at_risk: h.students_at_risk ?? 0,
            active_wow_delta: h.students_active_wow_delta ?? 0,
            at_risk_wow_delta: h.students_at_risk_wow_delta ?? 0,
          }}
        />
      )}
      {!anyOn && <PausedCard />}
      {journeys.myJourney && <MyJourneySection stats={stats.data} />}
      {journeys.teamJourney && <TeamJourneySection stats={stats.data} />}
    </div>
  );
}
```

- [ ] **Step 7: Delete the pie chart and check nothing else imports it**

```bash
git rm src/components/admin/task-status-chart.tsx
grep -rn "task-status-chart\|TaskStatusChart" src || echo "no references"
```
Expected: `no references`.

- [ ] **Step 8: Type-check and lint touched files**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/components/admin/admin-overview.tsx src/components/admin/overview src/components/admin/health-snapshot.tsx`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add -A src/components/admin
git commit -m "feat(admin): phase-aware overview; pipeline bars replace capped pie; settings cards leave the overview"
```

---

### Task 4: Settings page

**Files:**
- Create: `src/app/dashboard/admin/settings/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { redirect } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { ProgrammePhaseCard } from "@/components/admin/programme-phase-card";
import { AiReviewSettingsCard } from "@/components/admin/ai-review-settings-card";

export default function AdminSettingsPage() {
  const { user, loading } = useApp();

  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }
  if (loading) return <AdminSkeleton />;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm">
          Programme phase and the automatic task reviewer.
        </p>
      </div>
      <ProgrammePhaseCard />
      <AiReviewSettingsCard />
    </div>
  );
}
```

- [ ] **Step 2: Fix the phase card copy** — in `src/components/admin/programme-phase-card.tsx` the description says "Hidden pages stay reachable by URL and via Admin → Teams." Replace with "Hidden student pages stay reachable to admins under Admin → Team Journey."

- [ ] **Step 3: Type-check** — `npx tsc --noEmit -p tsconfig.json`. Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/admin/settings/page.tsx src/components/admin/programme-phase-card.tsx
git commit -m "feat(admin): settings page for programme phase + AI reviewer"
```

---

### Task 5: Sidebar sections and complete admin nav

**Files:**
- Modify: `src/components/nav-main.tsx:26-36` (type) and `:84-98` (sub-item render)
- Modify: `src/components/app-sidebar.tsx:128-155` (admin items)

**Interfaces:**
- Produces: `NavItem.items[].section?: string` — a muted label rendered above the first sub-item of each new section.

- [ ] **Step 1: Extend the type in `nav-main.tsx`**

```ts
  items?: {
    title: string;
    url: string;
    /** Muted group label rendered above the first item of a new section. */
    section?: string;
  }[];
```

Also export it so the sidebar can type its array: change `type NavItem = {` to `export type NavItem = {` and check `app-sidebar.tsx` for an existing `NavMainItem` type import — if `app-sidebar.tsx` defines its own `NavMainItem` type, add `section?: string` to that type's `items` entries too.

- [ ] **Step 2: Render section labels**

Replace the `item.items?.map(...)` block in `nav-main.tsx` with:

```tsx
{item.items?.map((subItem, index) => {
  const prev = item.items?.[index - 1];
  const showSection =
    !!subItem.section && subItem.section !== prev?.section;
  return (
    <React.Fragment key={subItem.url}>
      {showSection && (
        <li className="text-muted-foreground px-2 pt-2 pb-1 text-[10px] font-medium tracking-wider uppercase select-none">
          {subItem.section}
        </li>
      )}
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          asChild
          isActive={pathname === subItem.url}
        >
          <Link href={subItem.url}>
            <span>{subItem.title}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    </React.Fragment>
  );
})}
```

- [ ] **Step 3: Replace the admin `items` array in `app-sidebar.tsx`**

```ts
const teamSection = journeys.teamJourney
  ? "Team Journey"
  : "Team Journey · paused";
// ...
items: [
  { section: "Curriculum", title: "Tasks", url: "/dashboard/admin/tasks" },
  {
    section: "Curriculum",
    title: "AI Reviews",
    url: "/dashboard/admin/ai-reviews",
  },
  {
    section: "Curriculum",
    title: "Peer Reviews",
    url: "/dashboard/admin/peer-reviews",
  },
  { section: "People", title: "Users", url: "/dashboard/admin/users" },
  {
    section: "People",
    title: "Agreements",
    url: "/dashboard/admin/agreements",
  },
  { section: "People", title: "Diplomas", url: "/dashboard/admin/diplomas" },
  { section: teamSection, title: "Teams", url: "/dashboard/admin/teams" },
  {
    section: teamSection,
    title: "Weekly Reports",
    url: "/dashboard/admin/weekly-reports",
  },
  {
    section: teamSection,
    title: "Analytics",
    url: "/dashboard/admin/analytics",
  },
  {
    section: "System",
    title: "Activity Log",
    url: "/dashboard/admin/audit-logs",
  },
  { section: "System", title: "Settings", url: "/dashboard/admin/settings" },
],
```

`journeys` is already in the memo's dependency array.

- [ ] **Step 4: Type-check + lint** — `npx tsc --noEmit -p tsconfig.json && npx eslint src/components/nav-main.tsx src/components/app-sidebar.tsx`. Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/nav-main.tsx src/components/app-sidebar.tsx
git commit -m "feat(admin): sidebar grouped by Curriculum / People / Team Journey / System"
```

---

### Task 6: Users page — two tabs, sane default filter

**Files:**
- Modify: `src/app/dashboard/admin/users/page.tsx`
- Modify: `src/components/admin/admin-users-table.tsx:115`

- [ ] **Step 1: Remove the Roles tab**

In `users/page.tsx`: `validTabs = ["all-users", "invitations"]`; delete the `<TabsTrigger value="roles">` and the whole `<TabsContent value="roles">` block; rename triggers to `Users` / `Invitations`; change the H2 to `Users`; card title `All users`, description `Search, filter by batch or status, open a profile.`

- [ ] **Step 2: Default filter**

In `admin-users-table.tsx` line 115: `const [filter, setFilter] = useState("active");`

- [ ] **Step 3: Type-check** — `npx tsc --noEmit -p tsconfig.json`. Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/admin/users/page.tsx src/components/admin/admin-users-table.tsx
git commit -m "refactor(admin): users page drops the roles stub, opens on active users"
```

---

### Task 7: One Agreements page, Laptops & Keycards redirects

**Files:**
- Modify: `src/components/scholarship/AgreementsQueue.tsx:76-94, 209-216` (add `embedded` prop)
- Modify: `src/app/dashboard/admin/agreements/page.tsx` (rewrite)
- Modify: `src/app/dashboard/admin/laptops-keycards/page.tsx` (redirect)

**Interfaces:**
- Produces: `AgreementsQueueProps.embedded?: boolean` — when true the component renders no outer padding and no H2; title/description become an `h3`/`p` inside the tab.

- [ ] **Step 1: Add `embedded` to `AgreementsQueue`**

In the props interface add `/** Render inside a parent page that owns the H2 and padding. */ embedded?: boolean;` and destructure `embedded = false`. Change the wrapper/header to:

```tsx
<div className={embedded ? "space-y-4" : "flex-1 space-y-4 p-4 pt-6 md:p-8"}>
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      {embedded ? (
        <h3 className="text-lg font-semibold">{title}</h3>
      ) : (
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      )}
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
```

- [ ] **Step 2: Rewrite `agreements/page.tsx`**

```tsx
"use client";

import { useCallback } from "react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgreementsQueue } from "@/components/scholarship/AgreementsQueue";

const TABS = ["scholarships", "equipment"] as const;

export default function AdminAgreementsPage() {
  const { user, loading } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("tab");
  const tab = TABS.includes(fromUrl as (typeof TABS)[number])
    ? (fromUrl as (typeof TABS)[number])
    : "scholarships";

  const setTab = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "scholarships") params.delete("tab");
      else params.set("tab", next);
      const q = params.toString();
      router.replace(q ? `?${q}` : window.location.pathname, { scroll: false });
    },
    [router, searchParams]
  );

  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }
  if (loading) return <AdminSkeleton />;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Agreements</h2>
        <p className="text-muted-foreground text-sm">
          Review student submissions and countersign as the school.
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="scholarships">Scholarships</TabsTrigger>
          <TabsTrigger value="equipment">Laptops &amp; key cards</TabsTrigger>
        </TabsList>
        <TabsContent value="scholarships">
          <AgreementsQueue
            embedded
            title="Scholarship agreements"
            description="Full, partial and part-time scholarships."
            types={["full", "partial", "part_time"]}
            emptyMessage="No agreements yet. Share /full-scholarship-agreement or /partial-scholarship-agreement with students to get started."
          />
        </TabsContent>
        <TabsContent value="equipment">
          <AgreementsQueue
            embedded
            title="Equipment agreements"
            description="Laptop and key card handover paperwork."
            types={["laptop", "keycard"]}
            emptyMessage="No equipment agreements yet. Share /laptop-agreement or /keycard-agreement with students to get started."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

Note: the current `agreements/page.tsx` is a Server Component; the new one is a client component because of the tab state. `AgreementsQueue` is already `"use client"`.

- [ ] **Step 3: Turn `laptops-keycards/page.tsx` into a redirect**

```tsx
import { redirect } from "next/navigation";

/** Old bookmark target. Equipment agreements now live on the Agreements page. */
export default function AdminLaptopsKeycardsPage() {
  redirect("/dashboard/admin/agreements?tab=equipment");
}
```

- [ ] **Step 4: Fix stale references**

```bash
grep -rn "laptops-keycards" src docs --include=*.ts --include=*.tsx --include=*.md
```
Update any `href` to `/dashboard/admin/agreements?tab=equipment`; leave the redirect page and the `AgreementsQueue` doc comment (update its comment to name the tab instead of the old route).

- [ ] **Step 5: Type-check + lint** — `npx tsc --noEmit -p tsconfig.json && npx eslint src/app/dashboard/admin/agreements src/app/dashboard/admin/laptops-keycards src/components/scholarship/AgreementsQueue.tsx`. Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add -A src/app/dashboard/admin/agreements src/app/dashboard/admin/laptops-keycards src/components/scholarship/AgreementsQueue.tsx
git commit -m "refactor(admin): one agreements page with scholarship/equipment tabs"
```

---

### Task 8: Tasks page — no stub buttons, phase-aware default tab

**Files:**
- Modify: `src/app/dashboard/admin/tasks/page.tsx`

- [ ] **Step 1: Remove the two disabled buttons and the `Download`/`Button` imports** (both `<Button variant="outline" disabled title="Template generation coming soon">…</Button>` blocks).

- [ ] **Step 2: Default tab follows the phase**

```ts
import { usePlatformSettings } from "@/hooks/use-platform-settings";
// ...
const { data: journeys } = usePlatformSettings();
const defaultTab = journeys.teamJourney ? "team-tasks" : "individual-tasks";
const activeTab = validTabs.includes(tabFromUrl ?? "") ? tabFromUrl! : defaultTab;
```
and in `setActiveTab` replace `if (tab === "team-tasks")` with `if (tab === defaultTab)`. Put `defaultTab` in the `useCallback` deps.

- [ ] **Step 3: Copy** — H2 `Tasks`; card titles `Team tasks` / `Solo tasks`; descriptions `Collaborative tasks assigned to teams.` / `My Journey tasks each student completes alone.`

- [ ] **Step 4: Type-check + lint** — `npx tsc --noEmit -p tsconfig.json && npx eslint src/app/dashboard/admin/tasks/page.tsx`. Expected: clean (unused-import errors mean Step 1 missed an import).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/admin/tasks/page.tsx
git commit -m "refactor(admin): tasks page drops template stubs, opens on the active journey"
```

---

### Task 9: Analytics — remove the "coming soon" placeholder

**Files:**
- Modify: `src/components/admin/analytics/shared.tsx:35-…` (delete `AiPlaceholderCard`)
- Modify: `src/components/admin/analytics/overview-tab.tsx:14,130`
- Modify: `src/components/admin/analytics/student-detail-dialog.tsx:24,92`
- Modify: `src/components/admin/analytics/team-detail-dialog.tsx:25,105`

- [ ] **Step 1:** Delete the `AiPlaceholderCard` function from `shared.tsx` and remove any imports it alone used (`Sparkles` icon, `Badge`, if now unused).
- [ ] **Step 2:** In the three consumers, remove `AiPlaceholderCard` from the import line and delete the `<AiPlaceholderCard />` element (and any now-empty wrapper `div`).
- [ ] **Step 3:** `grep -rn "AiPlaceholderCard" src || echo clean` → `clean`. `npx tsc --noEmit -p tsconfig.json && npx eslint src/components/admin/analytics` → clean.
- [ ] **Step 4: Commit**

```bash
git add src/components/admin/analytics
git commit -m "chore(admin): drop the AI Analysis placeholder from analytics"
```

---

### Task 10: Delete the Progress page and its orphans

**Files:**
- Delete: `src/app/dashboard/admin/progress/page.tsx`, `src/components/admin/team-detail-modal.tsx`, `src/components/admin/student-progress-alerts.tsx`

- [ ] **Step 1: Confirm importers are only the page itself**

```bash
grep -rln "team-detail-modal\"\|student-progress-alerts\"" src
```
Expected: only `src/app/dashboard/admin/progress/page.tsx`.

- [ ] **Step 2: Delete**

```bash
git rm -r src/app/dashboard/admin/progress src/components/admin/team-detail-modal.tsx src/components/admin/student-progress-alerts.tsx
```

- [ ] **Step 3: Hunt remaining links**

```bash
grep -rn "/dashboard/admin/progress" src docs --include=*.ts --include=*.tsx --include=*.md
```
Expected: no hits in `src` (health-snapshot was fixed in Task 3). Update any `docs/` mention to say the page was removed 2026-09-11.

- [ ] **Step 4: Type-check** — `npx tsc --noEmit -p tsconfig.json`. Expected: clean.

- [ ] **Step 5: Commit**

```bash
git commit -am "chore(admin): remove the Progress page (duplicate of overview health + analytics)"
```

---

### Task 11: Activity Log — guard, shell, dead code

**Files:**
- Modify: `src/app/dashboard/admin/audit-logs/page.tsx:28-40, 176-185`
- Delete: `src/app/dashboard/admin/audit-logs/page-old.tsx`, `src/lib/audit-log-formatter.ts`

- [ ] **Step 1: Confirm the v1 formatter has no live importer**

```bash
grep -rln "audit-log-formatter\"" src
```
Expected: only `page-old.tsx`.

- [ ] **Step 2: Delete**

```bash
git rm src/app/dashboard/admin/audit-logs/page-old.tsx src/lib/audit-log-formatter.ts
```

- [ ] **Step 3: Add the admin guard**

At the top of `AuditLogsPage` (after the existing `useState` hooks, before any early return — hooks must stay unconditional):

```tsx
import { redirect } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
// inside the component, after the hooks:
const { user, loading: appLoading } = useApp();
if (!appLoading && (!user || user.primary_role !== "admin")) {
  redirect("/dashboard");
}
if (appLoading) return <AdminSkeleton />;
```
If the component already has a `loading` state variable, keep the alias `appLoading` to avoid the clash. Ensure every `useEffect`/`useState` is declared above this block.

- [ ] **Step 4: Standard shell**

Change the outer wrapper from `p-6 space-y-6` to `flex-1 space-y-4 p-4 pt-6 md:p-8`, and the `<h1>` to `<h2 className="text-3xl font-bold tracking-tight">Activity Log</h2>` with the description as `<p className="text-muted-foreground text-sm">`.

- [ ] **Step 5: Type-check + lint** — `npx tsc --noEmit -p tsconfig.json && npx eslint src/app/dashboard/admin/audit-logs`. Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add -A src/app/dashboard/admin/audit-logs src/lib
git commit -m "fix(admin): activity log gets the admin guard and standard shell; drop page-old + v1 formatter"
```

---

### Task 12: Docs, full verification, memory

**Files:**
- Create: `docs/documentation/admin-panel.md`
- Modify: `docs/documentation/economies.md` only if it references the removed Progress page or the overview settings cards.

- [ ] **Step 1: Write `docs/documentation/admin-panel.md`** (≤ 60 lines): the section table from the Design section above; the phase-gating rule for the overview; where each number comes from (`get_admin_program_health_v3`, `get_admin_task_pipeline_v1`, `get_ai_review_admin_summary_v1`); the "additive RPC, new name" rule; and the list of what was removed on 2026-09-11 and why.

- [ ] **Step 2: Whole-repo checks**

```bash
npm run lint
npx tsc --noEmit -p tsconfig.json
npx vitest run tests/admin/overview-rpcs.test.ts
npm run build
```
Expected: lint has only the ~66 known legacy errors (none in files touched here); tsc clean; test passes; build succeeds.

- [ ] **Step 3: Grep for leftovers**

```bash
grep -rn "Roles & Permissions\|Template generation coming soon\|Coming soon\|/dashboard/admin/progress\|laptops-keycards" src | grep -v "laptops-keycards/page.tsx"
```
Expected: no output.

- [ ] **Step 4: Local visual pass** — `npm run dev`, sign in as admin, open `/dashboard/admin` with Team Journey off (students card + My Journey section only), flip Team Journey on in Settings and confirm the Team Journey section appears, then flip it back off. Check sidebar labels, Users default filter, Agreements tabs, `/dashboard/admin/laptops-keycards` redirect, Tasks default tab, Activity Log guard (open in a non-admin session → redirected).

- [ ] **Step 5: Commit docs**

```bash
git add docs/documentation/admin-panel.md
git commit -m "docs(admin): admin panel sections, data sources and 2026-09-11 removals"
```

- [ ] **Step 6: Update memory** — rewrite `memory/project_dashboard_v2_cards.md` is NOT needed; instead create `project_admin_panel_restructure.md` (state: on `feature/admin-panel-restructure`, not pushed; what was deleted; migration applied; user's "not bloated" directive) and add its line to `MEMORY.md`.

Do **not** push. Report to the user with the branch name and the list of commits.
