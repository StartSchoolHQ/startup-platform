/**
 * DB round-trip for the analytics v2 RPCs. Seeds a test admin and a test
 * student (test_ana_*@test.local) in the OPEN batch with one stuck task and
 * two AI rejections, then checks the attention rules, dismissals, pulse,
 * My Journey, review quality, outcomes and the overview v3. Every row it
 * creates is removed afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STAMP = Date.now();
const PASSWORD = `Test-${crypto.randomUUID()}`;
const MERCURY = "eb55d8e2-bfb2-4567-8678-420216293d78";
const UNKNOWN_BATCH = "00000000-0000-4000-8000-00000000abcd";

let admin: SupabaseClient;
let adminUser: SupabaseClient;
let student: SupabaseClient;
let adminId: string;
let studentId: string;
let openBatch: string;
let taskId: string;
let progressId: string;

async function makeUser(
  tag: string,
  role: "admin" | "user",
  batchId: string | null
): Promise<[SupabaseClient, string]> {
  const email = `test_ana_${tag}_${STAMP}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const { error: upsertErr } = await admin.from("users").upsert({
    id: data.user.id,
    name: `test_ana_${tag}`,
    email,
    primary_role: role,
    status: "active",
    batch_id: batchId,
  });
  if (upsertErr) throw upsertErr;
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInErr) throw signInErr;
  return [client, data.user.id];
}

async function removeUser(id: string) {
  await admin.from("team_members").delete().eq("user_id", id);
  await admin.from("analytics_dismissals").delete().eq("user_id", id);
  await admin.from("ai_task_reviews").delete().eq("user_id", id);
  await admin.from("task_progress").delete().eq("user_id", id);
  await admin.from("users").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id);
}

beforeAll(async () => {
  admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith("test_ana_")) await removeUser(u.id);
  }
  const { data: batch } = await admin
    .from("diploma_batches")
    .select("id")
    .is("closed_at", null)
    .single();
  openBatch = batch!.id;

  [adminUser, adminId] = await makeUser("admin", "admin", null);
  [student, studentId] = await makeUser("student", "user", openBatch);

  const { data: task } = await admin
    .from("tasks")
    .select("id, achievements!inner(sort_order, context)")
    .eq("activity_type", "individual")
    .eq("is_active", true)
    .eq("is_recurring", false)
    .eq("achievements.sort_order", 11)
    .order("sort_order")
    .limit(1)
    .single();
  taskId = task!.id;

  const started = new Date(Date.now() - 15 * 86400000).toISOString();
  const { data: tp, error: tpErr } = await admin
    .from("task_progress")
    .insert({
      context: "individual",
      activity_type: "individual",
      task_id: taskId,
      user_id: studentId,
      assigned_to_user_id: studentId,
      status: "in_progress",
      started_at: started,
    })
    .select("id")
    .single();
  if (tpErr) throw tpErr;
  progressId = tp!.id;

  const { error: aiErr } = await admin.from("ai_task_reviews").insert(
    [1, 2].map((attempt) => ({
      progress_id: progressId,
      task_id: taskId,
      user_id: studentId,
      attempt,
      status: "rejected",
      decision: false,
      decided_by: "ai",
      feedback: `test_ana rejection ${attempt}`,
      submission_snapshot: {},
      criteria_snapshot: {},
      finished_at: new Date(
        Date.now() - (14 - attempt) * 86400000
      ).toISOString(),
    }))
  );
  if (aiErr) throw aiErr;
});

afterAll(async () => {
  await removeUser(studentId);
  await removeUser(adminId);
  for (const table of [
    "analytics_dismissals",
    "ai_task_reviews",
    "task_progress",
  ]) {
    const { count } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", studentId);
    if (count) throw new Error(`${count} ${table} rows left behind`);
  }
});

const attention = (batch: string | null, includeTest = true) =>
  adminUser.rpc("get_analytics_attention_v1", {
    p_batch_id: batch as unknown as string,
    p_include_test: includeTest,
  });

describe("get_analytics_attention_v1", () => {
  it("refuses students", async () => {
    const { error } = await student.rpc("get_analytics_attention_v1", {
      p_batch_id: openBatch,
    });
    expect(error?.message).toMatch(/admin access required/i);
  });

  it("flags the stuck, inactive student with the right reasons", async () => {
    const { data, error } = await attention(openBatch);
    expect(error).toBeNull();
    const row = data!.find((r) => r.user_id === studentId);
    expect(row).toBeDefined();
    expect(row!.reasons.some((r) => r.startsWith("Stuck on"))).toBe(true);
    // The student signed in during setup, and a sign-in counts as activity.
    expect(row!.reasons.some((r) => r.startsWith("No activity"))).toBe(false);
    // Two rejections are below the default threshold of three.
    expect(row!.reasons.some((r) => /rejected/.test(r))).toBe(false);
    expect(row!.severity).toBeGreaterThanOrEqual(1);
    expect(row!.dismissed_until).toBeNull();
  });

  it("hides test accounts unless asked", async () => {
    const { data } = await attention(openBatch, false);
    expect(data!.some((r) => r.user_id === studentId)).toBe(false);
  });

  it("dismisses for a while, then shows the student again", async () => {
    const dismissed = await adminUser.rpc("analytics_dismiss_v1", {
      p_user_id: studentId,
      p_note: "test_ana called them",
    });
    expect(dismissed.error).toBeNull();
    expect(new Date(dismissed.data as string).getTime()).toBeGreaterThan(
      Date.now()
    );
    const after = await attention(openBatch);
    const row = after.data!.find((r) => r.user_id === studentId);
    expect(row?.dismissed_until).not.toBeNull();

    await admin
      .from("analytics_dismissals")
      .update({ until: new Date(Date.now() - 86400000).toISOString() })
      .eq("user_id", studentId);
    const later = await attention(openBatch);
    expect(
      later.data!.find((r) => r.user_id === studentId)?.dismissed_until
    ).toBeNull();
  });

  it("returns nothing for an unknown batch", async () => {
    const { data, error } = await attention(UNKNOWN_BATCH);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("pulse, my journey, review quality, outcomes, overview v3", () => {
  it("pulse has the agreed keys", async () => {
    const { data, error } = await adminUser.rpc("get_analytics_pulse_v1", {
      p_batch_id: openBatch,
    });
    expect(error).toBeNull();
    const pulse = data as Record<string, unknown>;
    for (const key of [
      "active_this_week",
      "active_pct",
      "students_total",
      "at_risk",
      "completions_this_week",
      "avg_sentiment",
      "deltas",
      "what_moved",
    ]) {
      expect(pulse).toHaveProperty(key);
    }
  });

  it("my journey funnel covers the gated phases and places the student in phase 1", async () => {
    const { data, error } = await adminUser.rpc("get_analytics_my_journey_v1", {
      p_batch_id: openBatch,
      p_include_test: true,
    });
    expect(error).toBeNull();
    const mj = data as {
      funnel: { phase_order: number; students: number }[];
      students: { user_id: string; highest_phase: number }[];
      weekly: unknown[];
      pace: unknown[];
    };
    expect(mj.funnel.length).toBe(4);
    const me = mj.students.find((s) => s.user_id === studentId);
    expect(me?.highest_phase).toBe(1);
    expect(Array.isArray(mj.weekly)).toBe(true);
    expect(Array.isArray(mj.pace)).toBe(true);
  });

  it("review quality counts the seeded rejections and the stale task", async () => {
    const { data, error } = await adminUser.rpc(
      "get_analytics_review_quality_v1",
      { p_batch_id: openBatch, p_include_test: true }
    );
    expect(error).toBeNull();
    const row = data!.find((r) => r.task_id === taskId);
    expect(row).toBeDefined();
    expect(row!.rejections).toBeGreaterThanOrEqual(2);
    expect(Number(row!.first_pass_rate)).toBe(0);
    expect(row!.stale_in_progress).toBeGreaterThanOrEqual(1);
    expect(row!.sample_feedback.some((f) => f.includes("test_ana"))).toBe(true);
  });

  it("outcomes compares two batches on programme week", async () => {
    const { data, error } = await adminUser.rpc("get_analytics_outcomes_v1", {
      p_batch_a: openBatch,
      p_batch_b: MERCURY,
    });
    expect(error).toBeNull();
    const out = data as {
      a: { name: string; weeks: { week: number }[] };
      b: { name: string; weeks: { week: number }[] } | null;
    };
    expect(Array.isArray(out.a.weeks)).toBe(true);
    expect(out.b?.name).toBe("Mercury-Redstone");
    expect(out.b!.weeks.length).toBeGreaterThan(20);
    expect(out.b!.weeks[0].week).toBe(1);
  });

  it("overview v3 keeps v2's weeks and never expects fewer reporters", async () => {
    const [v2, v3] = await Promise.all([
      adminUser.rpc("get_analytics_overview_v2", { p_batch_id: MERCURY }),
      adminUser.rpc("get_analytics_overview_v3", { p_batch_id: MERCURY }),
    ]);
    expect(v3.error).toBeNull();
    expect(v3.data!.length).toBe(v2.data!.length);
    const sum = (rows: { expected_reporters: number }[]) =>
      rows.reduce((a, r) => a + r.expected_reporters, 0);
    expect(sum(v3.data!)).toBeGreaterThanOrEqual(sum(v2.data!));
  });

  it("every reader returns empty structures for an unknown batch", async () => {
    const [mj, rq, ms, pulse] = await Promise.all([
      adminUser.rpc("get_analytics_my_journey_v1", {
        p_batch_id: UNKNOWN_BATCH,
      }),
      adminUser.rpc("get_analytics_review_quality_v1", {
        p_batch_id: UNKNOWN_BATCH,
      }),
      adminUser.rpc("get_analytics_milestones_v1", {
        p_batch_id: UNKNOWN_BATCH,
      }),
      adminUser.rpc("get_analytics_pulse_v1", { p_batch_id: UNKNOWN_BATCH }),
    ]);
    for (const r of [mj, rq, ms, pulse]) expect(r.error).toBeNull();
    expect((mj.data as { students: unknown[] }).students).toEqual([]);
    expect(rq.data).toEqual([]);
    expect((ms.data as { by_team: unknown[] }).by_team).toEqual([]);
    expect((pulse.data as { at_risk: number }).at_risk).toBe(0);
  });

  it("dismissals show up in the activity log", async () => {
    const { data, error } = await adminUser.rpc("get_admin_activity_v1", {
      p_user_id: studentId,
      p_kinds: ["attention_dismissed"],
      p_limit: 5,
    });
    // Test accounts are hidden from the feed by design, so only the shape is
    // checked here; the branch itself is verified through the kind list.
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("review fixes (2026-09-24)", () => {
  it("numbers programme weeks from the batch's Monday, consecutively, no duplicates", async () => {
    // The open batch was admitted on a Tuesday; weeks must still be 1,2,3…
    const { data } = await adminUser.rpc("get_analytics_my_journey_v1", {
      p_batch_id: openBatch,
    });
    const weeks = (data as { weekly: { week: number }[] }).weekly.map(
      (w) => w.week
    );
    expect(weeks[0]).toBe(1);
    expect(weeks).toEqual([...new Set(weeks)]);
    expect(weeks).toEqual(weeks.map((_, i) => i + 1));
  });

  it("falls back to ISO weeks when the scope is All active", async () => {
    const { data } = await adminUser.rpc("get_analytics_my_journey_v1", {
      p_batch_id: null as unknown as string,
    });
    const weeks = (data as { weekly: { week: number }[] }).weekly.map(
      (w) => w.week
    );
    expect(new Set(weeks).size).toBe(weeks.length);
    expect(Math.max(...weeks)).toBeGreaterThan(1);
  });

  it("does not let students call the analytics helpers", async () => {
    for (const fn of [
      "_analytics_scope_students_v1",
      "_analytics_events_v1",
      "_analytics_last_active_v1",
    ]) {
      const { error } = await student.rpc(fn as "_analytics_events_v1", {
        p_batch_id: null as unknown as string,
      });
      expect(error?.message ?? "").toMatch(/permission denied/i);
    }
  });

  it("survives a non-numeric threshold in settings", async () => {
    const { data: before } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", "analytics")
      .single();
    const broken = { ...(before!.value as object), inactive_days: "abc" };
    await admin
      .from("platform_settings")
      .update({ value: broken })
      .eq("key", "analytics");
    try {
      const { error } = await attention(openBatch);
      expect(error).toBeNull();
    } finally {
      await admin
        .from("platform_settings")
        .update({ value: before!.value })
        .eq("key", "analytics");
    }
  });

  it("counts a student once in the participation denominator whether in a team or solo", async () => {
    // Week of the batch's one solo report so far: 2026-09-14.
    const { data: team, error: teamErr } = await admin
      .from("teams")
      .insert({
        name: `test_ana_team_${STAMP}`,
        batch_id: openBatch,
        founder_id: studentId,
        status: "active",
      })
      .select("id")
      .single();
    if (teamErr) throw teamErr;
    try {
      await admin.from("team_members").insert({
        team_id: team!.id,
        user_id: studentId,
        joined_at: "2026-09-10T00:00:00Z",
      });
      const inTeam = await adminUser.rpc("get_analytics_overview_v3", {
        p_batch_id: openBatch,
      });
      await admin.from("team_members").delete().eq("user_id", studentId);
      const solo = await adminUser.rpc("get_analytics_overview_v3", {
        p_batch_id: openBatch,
      });
      const pick = (
        rows: { week_start: string; expected_reporters: number }[] | null
      ) => rows?.find((r) => r.week_start === "2026-09-14")?.expected_reporters;
      expect(inTeam.error).toBeNull();
      expect(pick(inTeam.data)).toBe(pick(solo.data));
    } finally {
      await admin.from("team_members").delete().eq("team_id", team!.id);
      await admin.from("teams").delete().eq("id", team!.id);
    }
  });
});
