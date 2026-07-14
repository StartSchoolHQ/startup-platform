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
