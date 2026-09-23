/**
 * DB round-trip for suggest_task_v1. Creates ONE auth user
 * (test_sug_*@test.local), calls the RPC as that student through the anon
 * client, and deletes every row it created. Runs against the production
 * project like the other RPC tests.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EMAIL = `test_sug_${Date.now()}@test.local`;
const PASSWORD = `Test-${crypto.randomUUID()}`;
const RANDOM_ID = "00000000-0000-4000-8000-000000000000";

let admin: SupabaseClient;
let student: SupabaseClient;
let userId: string;
let phaseId: string;

async function purgeOrphans(): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const u of data.users.filter((x) => x.email?.startsWith("test_sug_"))) {
    await admin.from("task_suggestions").delete().eq("user_id", u.id);
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
    name: "test_sug_student",
    email: EMAIL,
    primary_role: "user",
    status: "active",
  });
  if (upsertErr) throw upsertErr;

  const { data: phase, error: phaseErr } = await admin
    .from("achievements")
    .select("id")
    .eq("context", "individual")
    .eq("active", true)
    .order("sort_order")
    .limit(1)
    .single();
  if (phaseErr) throw phaseErr;
  phaseId = phase.id;

  student = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInErr } = await student.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signInErr) throw signInErr;
});

afterAll(async () => {
  await admin.from("task_suggestions").delete().eq("user_id", userId);
  const { count } = await admin
    .from("task_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  expect(count).toBe(0);
  await admin.from("users").delete().eq("id", userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
});

describe("suggest_task_v1", () => {
  it("is not executable without a session", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const { error } = await anon.rpc("suggest_task_v1", {
      p_achievement_id: phaseId,
      p_title: "Read The Mom Test book",
      p_description:
        "Learn how to ask customers questions that get honest answers.",
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied|NOT_AUTHENTICATED/i);
  });

  it("rejects a direct insert from a student", async () => {
    const { error } = await student.from("task_suggestions").insert({
      user_id: userId,
      achievement_id: phaseId,
      title: "Direct insert",
      description: "Must be blocked by the missing insert policy.",
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  it("rejects an unknown phase and short text", async () => {
    const bad = await student.rpc("suggest_task_v1", {
      p_achievement_id: RANDOM_ID,
      p_title: "Read The Mom Test book",
      p_description:
        "Learn how to ask customers questions that get honest answers.",
    });
    expect(bad.error?.message).toContain("INVALID_PHASE");

    const short = await student.rpc("suggest_task_v1", {
      p_achievement_id: phaseId,
      p_title: "Hi",
      p_description:
        "Learn how to ask customers questions that get honest answers.",
    });
    expect(short.error?.message).toContain("INVALID_TITLE");
  });

  it("accepts five in 24h and refuses the sixth", async () => {
    for (let i = 0; i < 5; i++) {
      const { data, error } = await student.rpc("suggest_task_v1", {
        p_achievement_id: phaseId,
        p_title: `Interview ${i + 1} people who bought a competitor`,
        p_description:
          "Find out what made them pay and what almost stopped them.",
      });
      expect(error).toBeNull();
      const row = data as { id: string; remaining_today: number };
      expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(row.remaining_today).toBe(4 - i);
    }
    const sixth = await student.rpc("suggest_task_v1", {
      p_achievement_id: phaseId,
      p_title: "Build a landing page in one evening",
      p_description:
        "Ship something a stranger can react to before you polish.",
    });
    expect(sixth.error?.message).toContain("SUGGESTION_LIMIT_REACHED");

    const { data: mine } = await student
      .from("task_suggestions")
      .select("id, status, title")
      .eq("user_id", userId);
    expect(mine).toHaveLength(5);
    expect(mine!.every((r) => r.status === "pending")).toBe(true);
  });
});
