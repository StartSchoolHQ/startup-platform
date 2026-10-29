/**
 * DB round-trip for the task submission draft RPCs. Creates TWO auth users
 * (test_tsd_*@test.local: an owner and a stranger) and one individual
 * task_progress row, exercises save/get/delete through signed-in anon
 * clients, and deletes every row it created. Runs against the production
 * project.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STAMP = Date.now();
const OWNER_EMAIL = `test_tsd_${STAMP}@test.local`;
const OTHER_EMAIL = `test_tsd_${STAMP}_other@test.local`;
const PASSWORD = `Test-${crypto.randomUUID()}`;

let admin: SupabaseClient;
let owner: SupabaseClient;
let other: SupabaseClient;
let anon: SupabaseClient;
let ownerId: string;
let otherId: string;
let progressId: string;

async function deleteUserRows(id: string): Promise<void> {
  await admin.from("task_submission_drafts").delete().eq("user_id", id);
  await admin.from("task_progress").delete().eq("user_id", id);
  await admin.from("notifications").delete().eq("user_id", id);
  await admin.from("users").delete().eq("id", id);
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw error;
}

async function purgeOrphans(): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const u of data.users.filter((x) => x.email?.startsWith("test_tsd_"))) {
    await deleteUserRows(u.id);
  }
}

async function createStudent(email: string, name: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const { error: upsertErr } = await admin.from("users").upsert({
    id: data.user.id,
    name,
    email,
    primary_role: "user",
    status: "active",
  });
  if (upsertErr) throw upsertErr;
  return data.user.id;
}

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw error;
  return client;
}

async function draftRows(): Promise<{ draft: unknown; updated_at: string }[]> {
  const { data, error } = await admin
    .from("task_submission_drafts")
    .select("draft, updated_at")
    .eq("progress_id", progressId);
  if (error) throw error;
  return data ?? [];
}

async function setStatus(status: string): Promise<void> {
  const { error } = await admin
    .from("task_progress")
    .update({ status })
    .eq("id", progressId);
  if (error) throw error;
}

beforeAll(async () => {
  admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await purgeOrphans();
  ownerId = await createStudent(OWNER_EMAIL, "test_tsd_owner");
  otherId = await createStudent(OTHER_EMAIL, "test_tsd_other");

  const { data: task, error: taskErr } = await admin
    .from("tasks")
    .select("id")
    .like("template_code", "MJ-%")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (taskErr) throw taskErr;

  const { data: progress, error: progressErr } = await admin
    .from("task_progress")
    .insert({
      task_id: task.id,
      user_id: ownerId,
      context: "individual",
      activity_type: "individual",
      status: "in_progress",
    })
    .select("id")
    .single();
  if (progressErr) throw progressErr;
  progressId = progress.id;

  owner = await signIn(OWNER_EMAIL);
  other = await signIn(OTHER_EMAIL);
  anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}, 30000);

afterAll(async () => {
  const ids = [ownerId, otherId].filter(Boolean);
  for (const id of ids) await deleteUserRows(id);

  const { count: drafts } = await admin
    .from("task_submission_drafts")
    .select("progress_id", { count: "exact", head: true })
    .in("user_id", ids);
  const { count: progress } = await admin
    .from("task_progress")
    .select("id", { count: "exact", head: true })
    .in("user_id", ids);
  const { count: users } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .in("id", ids);
  const { data: authUsers, error } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw error;
  const leftover = authUsers.users.filter((u) =>
    u.email?.startsWith("test_tsd_")
  );
  expect(drafts).toBe(0);
  expect(progress).toBe(0);
  expect(users).toBe(0);
  expect(leftover).toHaveLength(0);
}, 30000);

describe("task submission draft RPCs", () => {
  it("owner saves, reads back, files key stripped", async () => {
    const { data, error } = await owner.rpc("save_task_submission_draft_v1", {
      p_progress_id: progressId,
      p_draft: { description: "half written", external_urls: [], files: [1] },
    });
    expect(error).toBeNull();
    expect(data.progress_id).toBe(progressId);
    expect(typeof data.updated_at).toBe("string");

    const { data: got, error: getErr } = await owner.rpc(
      "get_task_submission_draft_v1",
      { p_progress_id: progressId }
    );
    expect(getErr).toBeNull();
    expect(got.draft).toEqual({
      description: "half written",
      external_urls: [],
    });
    expect(typeof got.updated_at).toBe("string");
  });

  it("second save upserts (one row, newer updated_at)", async () => {
    const [before] = await draftRows();
    const { error } = await owner.rpc("save_task_submission_draft_v1", {
      p_progress_id: progressId,
      p_draft: { description: "more written", external_urls: [] },
    });
    expect(error).toBeNull();
    const rows = await draftRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].draft).toEqual({
      description: "more written",
      external_urls: [],
    });
    expect(new Date(rows[0].updated_at).getTime()).toBeGreaterThan(
      new Date(before.updated_at).getTime()
    );
  });

  it("another student is denied on save, get, delete", async () => {
    const save = await other.rpc("save_task_submission_draft_v1", {
      p_progress_id: progressId,
      p_draft: { description: "hijack" },
    });
    expect(save.error?.message).toContain("task_draft_denied");
    const get = await other.rpc("get_task_submission_draft_v1", {
      p_progress_id: progressId,
    });
    expect(get.error?.message).toContain("task_draft_denied");
    const del = await other.rpc("delete_task_submission_draft_v1", {
      p_progress_id: progressId,
    });
    expect(del.error?.message).toContain("task_draft_denied");
    expect(await draftRows()).toHaveLength(1);
  });

  it("save refused while pending_review", async () => {
    await setStatus("pending_review");
    const { error } = await owner.rpc("save_task_submission_draft_v1", {
      p_progress_id: progressId,
      p_draft: { description: "too late" },
    });
    expect(error?.message).toContain("task_draft_status_locked");
  });

  it("delete works while pending_review and returns 1, then get returns null", async () => {
    const { data, error } = await owner.rpc("delete_task_submission_draft_v1", {
      p_progress_id: progressId,
    });
    expect(error).toBeNull();
    expect(data).toBe(1);
    const { data: got, error: getErr } = await owner.rpc(
      "get_task_submission_draft_v1",
      { p_progress_id: progressId }
    );
    expect(getErr).toBeNull();
    expect(got).toBeNull();
  });

  it("non-object draft is refused", async () => {
    await setStatus("in_progress");
    const { error } = await owner.rpc("save_task_submission_draft_v1", {
      p_progress_id: progressId,
      p_draft: "text",
    });
    expect(error?.message).toContain("task_draft_invalid");
  });

  it("anon is denied", async () => {
    const { error } = await anon.rpc("get_task_submission_draft_v1", {
      p_progress_id: progressId,
    });
    expect(error?.message).toContain("permission denied for function");
  });
});
