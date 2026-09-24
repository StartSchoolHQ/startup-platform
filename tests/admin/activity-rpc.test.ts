/**
 * DB round-trip for get_admin_activity_v1. Creates a test admin and a test
 * student (test_act_*@test.local), gives the student one XP transaction, and
 * checks that the feed refuses students, serves admins, filters by kind, and
 * never surfaces test accounts. Every row it creates is removed afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ACTIVITY_KINDS } from "@/lib/activity/format";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STAMP = Date.now();
const PASSWORD = `Test-${crypto.randomUUID()}`;

let admin: SupabaseClient;
let adminUser: SupabaseClient;
let student: SupabaseClient;
let adminId: string;
let studentId: string;
let txId: string;

async function makeUser(
  tag: string,
  role: "admin" | "user"
): Promise<[SupabaseClient, string]> {
  const email = `test_act_${tag}_${STAMP}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const { error: upsertErr } = await admin.from("users").upsert({
    id: data.user.id,
    name: `test_act_${tag}`,
    email,
    primary_role: role,
    status: "active",
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
  await admin.from("transactions").delete().eq("user_id", id);
  await admin.from("users").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id);
}

beforeAll(async () => {
  admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.email?.startsWith("test_act_")) await removeUser(u.id);
  }
  [adminUser, adminId] = await makeUser("admin", "admin");
  [student, studentId] = await makeUser("student", "user");
  const { data: tx, error } = await admin
    .from("transactions")
    .insert({
      user_id: studentId,
      type: "admin_grant",
      activity_type: "individual",
      xp_change: 5,
      points_change: 0,
      description: "test_act grant",
    })
    .select("id")
    .single();
  if (error) throw error;
  txId = tx.id;
});

afterAll(async () => {
  await removeUser(studentId);
  await removeUser(adminId);
  const { count } = await admin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("id", txId);
  if (count) throw new Error("test transaction left behind");
});

describe("get_admin_activity_v1", () => {
  it("refuses students", async () => {
    const { error } = await student.rpc("get_admin_activity_v1", {
      p_limit: 5,
    });
    expect(error?.message).toContain("Admin access required");
  });

  it("serves admins well-formed rows, newest first", async () => {
    const { data, error } = await adminUser.rpc("get_admin_activity_v1", {
      p_limit: 50,
    });
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    for (const row of data!) {
      expect(ACTIVITY_KINDS).toContain(row.kind);
      expect(row.subject_user_id).toBeTruthy();
      expect(row.subject_name).toBeTruthy();
      expect(row.occurred_at).toBeTruthy();
    }
    const times = data!.map((r) => new Date(r.occurred_at).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("filters by kind and by date", async () => {
    const { data, error } = await adminUser.rpc("get_admin_activity_v1", {
      p_kinds: ["xp"],
      p_from: "2026-01-01T00:00:00Z",
      p_limit: 20,
    });
    expect(error).toBeNull();
    expect(data!.every((r) => r.kind === "xp")).toBe(true);
  });

  it("never shows test accounts", async () => {
    const { data, error } = await adminUser.rpc("get_admin_activity_v1", {
      p_user_id: studentId,
      p_limit: 50,
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("pages with limit and offset", async () => {
    const first = await adminUser.rpc("get_admin_activity_v1", {
      p_limit: 3,
      p_offset: 0,
    });
    const second = await adminUser.rpc("get_admin_activity_v1", {
      p_limit: 3,
      p_offset: 3,
    });
    expect(first.data!.length).toBe(3);
    const ids = new Set(first.data!.map((r) => r.id));
    for (const r of second.data!) expect(ids.has(r.id)).toBe(false);
  });
});

describe("get_users_for_filter", () => {
  it("hides test accounts", async () => {
    const { data, error } = await adminUser.rpc("get_users_for_filter");
    expect(error).toBeNull();
    expect(data!.some((u) => u.id === studentId)).toBe(false);
  });
});
