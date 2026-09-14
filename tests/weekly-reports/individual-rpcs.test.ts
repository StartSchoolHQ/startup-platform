/**
 * DB round-trip for the solo weekly-report RPCs. Creates ONE auth user
 * (test_iwr_*@test.local), submits as that student through the anon client,
 * and deletes every row it created. Runs against the production project.
 * Skips the write tests when My Journey is switched off (the RPC refuses).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EMAIL = `test_iwr_${Date.now()}@test.local`;
const PASSWORD = `Test-${crypto.randomUUID()}`;

let admin: SupabaseClient;
let student: SupabaseClient;
let userId: string;
let myJourneyOn = true;

const validReport = {
  commitments: [
    {
      text: "Finish customer interview script",
      status: "completed",
      explanation: "",
    },
    { text: "", status: "completed", explanation: "" },
  ],
  blockers: "",
  nextWeekCommitments: ["Run five interviews", "   "],
  alignmentScore: 8,
  alignmentReason: "Clear plan for the week",
  ignoredKey: "must be dropped",
};

async function purgeOrphans(): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const u of data.users.filter((x) => x.email?.startsWith("test_iwr_"))) {
    await admin.from("weekly_reports").delete().eq("user_id", u.id);
    await admin.from("notifications").delete().eq("user_id", u.id);
    await admin.from("users").delete().eq("id", u.id);
    const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
    if (delErr) throw delErr;
  }
}

beforeAll(async () => {
  admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await purgeOrphans();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  userId = created.user.id;
  const { error: upsertErr } = await admin.from("users").upsert({
    id: userId,
    name: "test_iwr_student",
    email: EMAIL,
    primary_role: "user",
    status: "active",
  });
  if (upsertErr) throw upsertErr;

  const { data: settings } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "journeys")
    .single();
  myJourneyOn =
    (settings?.value as { my_journey?: boolean } | null)?.my_journey !== false;

  student = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInErr } = await student.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signInErr) throw signInErr;
}, 30000);

afterAll(async () => {
  const { error: wrErr } = await admin
    .from("weekly_reports")
    .delete()
    .eq("user_id", userId);
  if (wrErr) throw wrErr;
  await admin.from("notifications").delete().eq("user_id", userId);
  const { error: userErr } = await admin
    .from("users")
    .delete()
    .eq("id", userId);
  if (userErr) throw userErr;
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) throw authErr;
  const { count } = await admin
    .from("weekly_reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  expect(count).toBe(0);
}, 30000);

describe("get_individual_weekly_report_status_v1", () => {
  it("returns the current week and no report for a fresh student", async () => {
    const { data, error } = await student.rpc(
      "get_individual_weekly_report_status_v1"
    );
    expect(error).toBeNull();
    expect(data.week.week_number).toBeGreaterThan(0);
    expect(data.submitted).toBe(false);
    expect(data.draft).toBeNull();
    expect(data.history).toEqual([]);
  });
});

describe("submit_individual_weekly_report_v1", () => {
  it("saves a draft without validating", async (ctx) => {
    if (!myJourneyOn) ctx.skip();
    const { data, error } = await student.rpc(
      "submit_individual_weekly_report_v1",
      {
        p_submission_data: { commitments: [], alignmentReason: "x" },
        p_as_draft: true,
      }
    );
    expect(error).toBeNull();
    expect(data.status).toBe("draft");

    const { data: status } = await student.rpc(
      "get_individual_weekly_report_status_v1"
    );
    expect(status.submitted).toBe(false);
    expect(status.draft.alignmentReason).toBe("x");
    expect(status.draft.submittedAt).toBeUndefined();
  });

  it("rejects a submit with no commitments", async (ctx) => {
    if (!myJourneyOn) ctx.skip();
    const { error } = await student.rpc("submit_individual_weekly_report_v1", {
      p_submission_data: { ...validReport, commitments: [] },
    });
    expect(error?.message).toContain("At least one commitment is required");
  });

  it("rejects an alignment score of 11", async (ctx) => {
    if (!myJourneyOn) ctx.skip();
    const { error } = await student.rpc("submit_individual_weekly_report_v1", {
      p_submission_data: { ...validReport, alignmentScore: 11 },
    });
    expect(error?.message).toContain("between 1 and 10");
  });

  it("rejects a commitment shorter than 5 characters", async (ctx) => {
    if (!myJourneyOn) ctx.skip();
    const { error } = await student.rpc("submit_individual_weekly_report_v1", {
      p_submission_data: {
        ...validReport,
        commitments: [{ text: "abcd", status: "completed", explanation: "" }],
      },
    });
    expect(error?.message).toContain(
      "Commitment must be at least 5 characters"
    );
  });

  it("rejects a next-week commitment shorter than 5 characters", async (ctx) => {
    if (!myJourneyOn) ctx.skip();
    const { error } = await student.rpc("submit_individual_weekly_report_v1", {
      p_submission_data: { ...validReport, nextWeekCommitments: ["abcd"] },
    });
    expect(error?.message).toContain(
      "Next week commitment must be at least 5 characters"
    );
  });

  it("submits over the draft, normalises the payload, then refuses a second submit", async (ctx) => {
    if (!myJourneyOn) ctx.skip();
    const { data, error } = await student.rpc(
      "submit_individual_weekly_report_v1",
      { p_submission_data: validReport }
    );
    expect(error).toBeNull();
    expect(data.status).toBe("submitted");

    const { data: rows } = await admin
      .from("weekly_reports")
      .select("id, context, team_id, status, submission_data")
      .eq("user_id", userId);
    expect(rows).toHaveLength(1); // draft row was upgraded, not duplicated
    const row = rows![0];
    expect(row.context).toBe("individual");
    expect(row.team_id).toBeNull();
    expect(row.status).toBe("submitted");
    const sd = row.submission_data as Record<string, unknown>;
    expect(Object.keys(sd).sort()).toEqual(
      [
        "alignmentReason",
        "alignmentScore",
        "blockers",
        "commitments",
        "nextWeekCommitments",
        "submittedAt",
      ].sort()
    );
    expect(sd.commitments).toHaveLength(1); // blank row dropped
    expect(sd.nextWeekCommitments).toEqual(["Run five interviews"]);

    const { data: status } = await student.rpc(
      "get_individual_weekly_report_status_v1"
    );
    expect(status.submitted).toBe(true);
    expect(status.draft).toBeNull();
    expect(status.history).toHaveLength(1);

    const { error: again } = await student.rpc(
      "submit_individual_weekly_report_v1",
      { p_submission_data: validReport }
    );
    expect(again?.message).toContain("ALREADY_SUBMITTED");
  });

  it("refuses anonymous callers", async () => {
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await anon.rpc("submit_individual_weekly_report_v1", {
      p_submission_data: validReport,
    });
    expect(error).not.toBeNull();
  });
});
