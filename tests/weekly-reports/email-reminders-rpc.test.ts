/**
 * DB round-trip for the weekly-report EMAIL reminder RPCs (consumed by the
 * n8n workflow, service role only). Creates ONE auth user
 * (test_wre_*@test.local) and deletes every row it created. Runs against the
 * production project. Skips the recipient assertions when My Journey is off
 * (the RPC then returns no solo rows by design).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EMAIL = `test_wre_${Date.now()}@test.local`;
const PASSWORD = `Test-${crypto.randomUUID()}`;

type Recipient = {
  user_id: string | null;
  name: string;
  email: string;
  context: "individual" | "team";
  team_name: string | null;
  kind: "2day" | "1day";
  week_year: number;
  week_number: number;
  due_label: string;
};

let admin: SupabaseClient;
let userId: string;
let myJourneyOn = true;
let week: { week_year: number; week_number: number };

async function purgeOrphans(): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const u of data.users.filter((x) => x.email?.startsWith("test_wre_"))) {
    await admin.from("weekly_report_email_log").delete().eq("user_id", u.id);
    await admin.from("weekly_reports").delete().eq("user_id", u.id);
    await admin.from("notifications").delete().eq("user_id", u.id);
    await admin.from("users").delete().eq("id", u.id);
    const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
    if (delErr) throw delErr;
  }
}

async function recipients(kind: string): Promise<Recipient[]> {
  const { data, error } = await admin.rpc(
    "get_weekly_report_email_recipients_v1",
    { p_kind: kind }
  );
  if (error) throw error;
  return data as Recipient[];
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
    name: "test_wre_student",
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

  const { data: wk, error: wkErr } = await admin.rpc(
    "get_riga_week_boundaries_v2",
    { input_date: new Date().toISOString(), p_cutoff: "12:00:00" }
  );
  if (wkErr) throw wkErr;
  week = (Array.isArray(wk) ? wk[0] : wk) as typeof week;
});

afterAll(async () => {
  await admin.from("weekly_report_email_log").delete().eq("user_id", userId);
  await admin.from("weekly_reports").delete().eq("user_id", userId);
  await admin.from("notifications").delete().eq("user_id", userId);
  await admin.from("users").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);
  const { count } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .like("email", "test_wre_%");
  expect(count).toBe(0);
});

describe("get_weekly_report_email_recipients_v1", () => {
  it("rejects an unknown kind", async () => {
    const { error } = await admin.rpc("get_weekly_report_email_recipients_v1", {
      p_kind: "3day",
    });
    expect(error?.message).toContain("p_kind");
  });

  it("lists a confirmed, active student with no report this week", async () => {
    if (!myJourneyOn) return;
    const rows = await recipients("2day");
    const me = rows.find((r) => r.user_id === userId);
    expect(me).toBeDefined();
    expect(me).toMatchObject({
      email: EMAIL,
      context: "individual",
      team_name: null,
      kind: "2day",
      week_year: week.week_year,
      week_number: week.week_number,
    });
    expect(me!.due_label).toContain("12:00");
  });

  it("drops the student once this week's report is submitted", async () => {
    if (!myJourneyOn) return;
    const { data: wk } = await admin.rpc("get_riga_week_boundaries_v2", {
      input_date: new Date().toISOString(),
      p_cutoff: "12:00:00",
    });
    const w = (Array.isArray(wk) ? wk[0] : wk) as {
      week_start: string;
      week_end: string;
    };
    const { error } = await admin.from("weekly_reports").insert({
      user_id: userId,
      team_id: null,
      context: "individual",
      status: "submitted",
      week_start_date: w.week_start,
      week_end_date: w.week_end,
      week_number: week.week_number,
      week_year: week.week_year,
      submission_data: {},
      submitted_at: new Date().toISOString(),
    });
    if (error) throw error;
    const rows = await recipients("2day");
    expect(rows.find((r) => r.user_id === userId)).toBeUndefined();
    await admin.from("weekly_reports").delete().eq("user_id", userId);
  });

  it("test emails return synthetic rows only, no user ids", async () => {
    const { data, error } = await admin.rpc(
      "get_weekly_report_email_recipients_v1",
      { p_kind: "1day", p_test_emails: ["a@startschool.org", "b@x.org"] }
    );
    if (error) throw error;
    const rows = data as Recipient[];
    expect(rows.map((r) => r.email).sort()).toEqual([
      "a@startschool.org",
      "b@x.org",
    ]);
    expect(rows.every((r) => r.user_id === null)).toBe(true);
    expect(rows.every((r) => r.kind === "1day")).toBe(true);
  });

  it("is denied to anon and to a signed-in student", async () => {
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: anonErr } = await anon.rpc(
      "get_weekly_report_email_recipients_v1",
      { p_kind: "2day" }
    );
    expect(anonErr?.message).toMatch(/permission denied/i);

    const { error: signInErr } = await anon.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    if (signInErr) throw signInErr;
    const { error: authErr } = await anon.rpc(
      "get_weekly_report_email_recipients_v1",
      { p_kind: "2day" }
    );
    expect(authErr?.message).toMatch(/permission denied/i);
    await anon.auth.signOut();
  });
});

describe("weekly_report_email_mark_sent_v1", () => {
  it("logs once, then hides the student and refuses a duplicate", async () => {
    if (!myJourneyOn) return;
    const args = {
      p_user_id: userId,
      p_context: "individual",
      p_kind: "2day",
      p_week_year: week.week_year,
      p_week_number: week.week_number,
      p_email: EMAIL,
    };
    const first = await admin.rpc("weekly_report_email_mark_sent_v1", args);
    if (first.error) throw first.error;
    expect(first.data).toBe(1);

    const rows = await recipients("2day");
    expect(rows.find((r) => r.user_id === userId)).toBeUndefined();
    // The other kind is still due.
    const other = await recipients("1day");
    expect(other.find((r) => r.user_id === userId)).toBeDefined();

    const second = await admin.rpc("weekly_report_email_mark_sent_v1", args);
    if (second.error) throw second.error;
    expect(second.data).toBe(0);

    const { count } = await admin
      .from("weekly_report_email_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    expect(count).toBe(1);
  });

  it("ignores synthetic test rows (null user id)", async () => {
    const { data, error } = await admin.rpc(
      "weekly_report_email_mark_sent_v1",
      {
        p_user_id: null,
        p_context: "individual",
        p_kind: "2day",
        p_week_year: week.week_year,
        p_week_number: week.week_number,
        p_email: "a@startschool.org",
      }
    );
    if (error) throw error;
    expect(data).toBe(0);
  });
});
