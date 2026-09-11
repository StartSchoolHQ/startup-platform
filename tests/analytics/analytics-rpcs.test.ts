/**
 * Admin analytics RPCs — read-only shape and guard tests.
 *
 * Creates one temporary auth user with primary_role=admin (test_ prefixed,
 * removed in afterAll), signs in with the anon client, and exercises every
 * get_analytics_* function against real data. Nothing is written besides
 * the throwaway test user.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const TEST_EMAIL = `test_analytics_${Date.now()}@test.local`;
const TEST_PASSWORD = `Test-${crypto.randomUUID()}`;

let admin: SupabaseClient;
let authed: SupabaseClient;
let testUserId: string;

beforeAll(async () => {
  admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    }
  );
  if (createErr) throw createErr;
  testUserId = created.user.id;

  // Ensure a users row with admin role exists (upsert in case a trigger
  // already created the profile row).
  const { error: upsertErr } = await admin.from("users").upsert({
    id: testUserId,
    name: "test_analytics_admin",
    email: TEST_EMAIL,
    primary_role: "admin",
    status: "active",
  });
  if (upsertErr) throw upsertErr;

  authed = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInErr } = await authed.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signInErr) throw signInErr;
}, 30000);

afterAll(async () => {
  if (testUserId) {
    await admin.from("users").delete().eq("id", testUserId);
    await admin.auth.admin.deleteUser(testUserId);
  }
}, 30000);

describe("analytics RPC guard", () => {
  it("rejects callers without an authenticated admin user", async () => {
    const { error } = await admin.rpc("get_analytics_overview");
    expect(error).not.toBeNull();
    expect(error!.message).toContain("admin access required");
  });
});

describe("get_analytics_overview", () => {
  it("returns weekly rows with sane aggregates", async () => {
    const { data, error } = await authed.rpc("get_analytics_overview");
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);
    for (const row of data!) {
      expect(row.week_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.reports).toBeGreaterThan(0);
      if (row.avg_score != null) {
        expect(Number(row.avg_score)).toBeGreaterThanOrEqual(1);
        expect(Number(row.avg_score)).toBeLessThanOrEqual(10);
      }
      expect(row.low_scores + row.high_scores).toBeLessThanOrEqual(row.reports);
      expect(row.commitments_completed).toBeLessThanOrEqual(
        row.commitments_total
      );
    }
  });
});

describe("get_analytics_teams / team_detail", () => {
  it("returns team-week rows and drill-down with report ids", async () => {
    const { data, error } = await authed.rpc("get_analytics_teams");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    const first = data![0];
    expect(first.team_id).toBeTruthy();
    expect(first.team_name).toBeTruthy();

    const { data: detail, error: detailErr } = await authed.rpc(
      "get_analytics_team_detail",
      { p_team_id: first.team_id }
    );
    expect(detailErr).toBeNull();
    expect(detail!.length).toBeGreaterThan(0);
    expect(detail![0].report_id).toBeTruthy();
  });
});

describe("get_analytics_students / student_detail", () => {
  it("returns one row per reporting student with sparkline scores", async () => {
    const { data, error } = await authed.rpc("get_analytics_students");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    const first = data![0];
    expect(first.user_id).toBeTruthy();
    expect(Array.isArray(first.scores)).toBe(true);
    expect(first.weeks_submitted).toBeGreaterThan(0);

    const { data: detail, error: detailErr } = await authed.rpc(
      "get_analytics_student_detail",
      { p_user_id: first.user_id }
    );
    expect(detailErr).toBeNull();
    expect(detail!.length).toBe(first.weeks_submitted);
    expect(detail![0].report_id).toBeTruthy();
  });
});

describe("get_analytics_week_detail", () => {
  it("returns all reports of a week, lowest score first", async () => {
    const { data: overview } = await authed.rpc("get_analytics_overview");
    const week = overview![0].week_start;
    const { data, error } = await authed.rpc("get_analytics_week_detail", {
      p_week_start: week,
    });
    expect(error).toBeNull();
    expect(data!.length).toBe(overview![0].reports);
    const scores = data!
      .map((r: { score: number | null }) => r.score)
      .filter((s: number | null): s is number => s != null);
    const sorted = [...scores].sort((a, b) => a - b);
    expect(scores).toEqual(sorted);
  });
});

describe("get_analytics_meetings", () => {
  it("returns weekly volume, interest funnel, teams and learnings", async () => {
    const { data, error } = await authed.rpc("get_analytics_meetings");
    expect(error).toBeNull();
    expect(data.weekly.length).toBeGreaterThan(0);
    expect(data.interest_funnel.length).toBeGreaterThan(0);
    expect(data.by_team.length).toBeGreaterThan(0);
    const funnelTotal = data.interest_funnel.reduce(
      (a: number, f: { count: number }) => a + f.count,
      0
    );
    const teamTotal = data.by_team.reduce(
      (a: number, t: { meetings: number }) => a + t.meetings,
      0
    );
    expect(funnelTotal).toBe(teamTotal);
  });
});

describe("get_analytics_retention", () => {
  it("returns cohort curve and leavers with prior scores", async () => {
    const { data, error } = await authed.rpc("get_analytics_retention");
    expect(error).toBeNull();
    expect(data.total_reporters).toBeGreaterThan(0);
    expect(data.cohort.length).toBeGreaterThan(0);
    for (const c of data.cohort) {
      expect(c.reporters).toBeLessThanOrEqual(data.total_reporters);
      expect(Number(c.pct_of_all)).toBeGreaterThan(0);
      expect(Number(c.pct_of_all)).toBeLessThanOrEqual(100);
    }
    expect(Array.isArray(data.leavers)).toBe(true);
    if (data.leavers.length > 0) {
      expect(data.leavers[0].left_at).toBeTruthy();
      expect(Array.isArray(data.leavers[0].last_scores)).toBe(true);
    }
  });
});

describe("get_analytics_strikes", () => {
  it("returns weekly strikes and per-team totals", async () => {
    const { data, error } = await authed.rpc("get_analytics_strikes");
    expect(error).toBeNull();
    expect(data.weekly.length).toBeGreaterThan(0);
    expect(data.by_team.length).toBeGreaterThan(0);
    for (const w of data.weekly) {
      expect(w.resolved + w.explained).toBeLessThanOrEqual(w.strikes);
    }
  });
});

describe("get_analytics_task_friction", () => {
  it("returns least completed, slowest and rejected tasks", async () => {
    const { data, error } = await authed.rpc("get_analytics_task_friction");
    expect(error).toBeNull();
    expect(data.least_completed.length).toBeGreaterThan(0);
    for (const t of data.least_completed) {
      expect(t.approved).toBeLessThanOrEqual(t.assigned);
      expect(Number(t.approval_rate)).toBeGreaterThanOrEqual(0);
      expect(Number(t.approval_rate)).toBeLessThanOrEqual(100);
    }
    expect(data.slowest.length).toBeGreaterThan(0);
    for (const t of data.slowest) {
      expect(Number(t.avg_days)).toBeGreaterThan(0);
    }
  });
});

describe("get_analytics_economy", () => {
  it("returns weekly earn/lose and penalty stats", async () => {
    const { data, error } = await authed.rpc("get_analytics_economy");
    expect(error).toBeNull();
    expect(data.weekly.length).toBeGreaterThan(0);
    expect(data.by_type.length).toBeGreaterThan(0);
    expect(data.penalties.penalty_count).toBeGreaterThanOrEqual(
      data.penalties.refund_count
    );
    expect(data.penalties.users_penalized).toBeGreaterThan(0);
  });
});

describe("get_analytics_student_detail (extended)", () => {
  it("includes commitments follow-through per week", async () => {
    const { data: students } = await authed.rpc("get_analytics_students");
    const { data, error } = await authed.rpc("get_analytics_student_detail", {
      p_user_id: students![0].user_id,
    });
    expect(error).toBeNull();
    for (const row of data!) {
      expect(row.commitments_completed).toBeLessThanOrEqual(
        row.commitments_total
      );
    }
  });
});

describe("get_analytics_tasks", () => {
  it("returns top tasks, funnel and weekly completions", async () => {
    const { data, error } = await authed.rpc("get_analytics_tasks");
    expect(error).toBeNull();
    expect(data.top_tasks.length).toBeGreaterThan(0);
    expect(data.top_tasks.length).toBeLessThanOrEqual(15);
    expect(data.status_funnel.length).toBeGreaterThan(0);
    expect(data.weekly_completions.length).toBeGreaterThan(0);
    for (const t of data.top_tasks) {
      expect(t.title).toBeTruthy();
      expect(t.completions).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Batch-scoped v2 functions (2026-09-11). NULL = current cohort (active
// users/teams only); a batch id = that archived cohort.
const BATCH2 = "eb55d8e2-bfb2-4567-8678-420216293d78"; // Mercury-Redstone

describe("batch-scoped analytics v2", () => {
  it("current scope never returns an archived team", async () => {
    const { data, error } = await authed.rpc("get_analytics_teams_v2", {
      p_batch_id: null,
    });
    expect(error).toBeNull();
    for (const row of data ?? []) {
      expect(row.team_status).not.toBe("archived");
    }
  });

  it("batch scope returns only that batch's teams and students", async () => {
    const { data: teams } = await authed.rpc("get_analytics_teams_v2", {
      p_batch_id: BATCH2,
    });
    expect(teams!.length).toBeGreaterThan(0);
    const { data: batchTeams } = await admin
      .from("teams")
      .select("id")
      .eq("batch_id", BATCH2);
    const allowed = new Set((batchTeams ?? []).map((t) => t.id));
    for (const row of teams!) expect(allowed.has(row.team_id)).toBe(true);

    const { data: students } = await authed.rpc("get_analytics_students_v2", {
      p_batch_id: BATCH2,
    });
    const { data: batchUsers } = await admin
      .from("users")
      .select("id")
      .eq("batch_id", BATCH2);
    const allowedUsers = new Set((batchUsers ?? []).map((u) => u.id));
    expect(students!.length).toBeGreaterThan(0);
    for (const row of students!)
      expect(allowedUsers.has(row.user_id)).toBe(true);
  });

  it("week detail v2 matches the scoped overview report count", async () => {
    const { data: overview } = await authed.rpc("get_analytics_overview_v2", {
      p_batch_id: BATCH2,
    });
    expect(overview!.length).toBeGreaterThan(0);
    const week = overview![0];
    const { data, error } = await authed.rpc("get_analytics_week_detail_v2", {
      p_week_start: week.week_start,
      p_batch_id: BATCH2,
    });
    expect(error).toBeNull();
    expect(data!.length).toBe(week.reports);
  });

  it("jsonb v2 functions answer in both scopes", async () => {
    for (const fn of [
      "get_analytics_tasks_v2",
      "get_analytics_meetings_v2",
      "get_analytics_retention_v2",
      "get_analytics_strikes_v2",
      "get_analytics_economy_v2",
      "get_analytics_task_friction_v2",
    ]) {
      for (const p_batch_id of [null, BATCH2]) {
        const { data, error } = await authed.rpc(fn, { p_batch_id });
        expect(error, `${fn}(${p_batch_id})`).toBeNull();
        expect(typeof data).toBe("object");
      }
    }
  });

  it("current scope has no Batch 2 reporters", async () => {
    const { data } = await authed.rpc("get_analytics_retention_v2", {
      p_batch_id: null,
    });
    const { count } = await admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("primary_role", "user")
      .eq("status", "active");
    expect(data.total_reporters).toBeLessThanOrEqual(count ?? 0);
  });
});
