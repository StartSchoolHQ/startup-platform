/**
 * DB round-trip for the Startie RPCs and RLS. Creates TWO auth users
 * (test_startie_*@test.local), calls the RPCs as those students through the
 * anon client, and deletes every row it created. Runs against the production
 * project like the other RPC tests.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STAMP = Date.now();
const PASSWORD = `Test-${crypto.randomUUID()}`;

let admin: SupabaseClient;
let a: SupabaseClient;
let b: SupabaseClient;
let aId: string;
let bId: string;
let aThread: string;

async function makeStudent(tag: string): Promise<[SupabaseClient, string]> {
  const email = `test_startie_${tag}_${STAMP}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const { error: upsertErr } = await admin.from("users").upsert({
    id: data.user.id,
    name: `test_startie_${tag}`,
    email,
    primary_role: "user",
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

async function removeUser(id: string): Promise<void> {
  await admin.from("assistant_messages").delete().eq("user_id", id);
  await admin.from("assistant_threads").delete().eq("user_id", id);
  await admin.from("users").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id);
}

async function purgeOrphans(): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const u of data.users) {
    if (u.email?.startsWith("test_startie_")) await removeUser(u.id);
  }
}

async function send(
  client: SupabaseClient,
  content: string,
  threadId: string | null = null
) {
  return client.rpc("assistant_send_message_v1", {
    p_thread_id: threadId,
    p_content: content,
    p_page_context: { route: "/dashboard/my-journey" },
  });
}

async function userMessageCount(userId: string): Promise<number> {
  const { count, error } = await admin
    .from("assistant_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user");
  if (error) throw error;
  return count ?? 0;
}

beforeAll(async () => {
  admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await purgeOrphans();
  [a, aId] = await makeStudent("a");
  [b, bId] = await makeStudent("b");
});

afterAll(async () => {
  await removeUser(aId);
  await removeUser(bId);
  for (const table of ["assistant_messages", "assistant_threads"]) {
    const { count } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("user_id", [aId, bId]);
    if (count) throw new Error(`${count} ${table} rows left behind`);
  }
});

describe("assistant_send_message_v1", () => {
  it("creates a thread on the first send and returns 24 remaining", async () => {
    const { data, error } = await send(a, "How do phases unlock?");
    expect(error).toBeNull();
    expect(data.remaining_today).toBe(24);
    expect(data.thread_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(data.message_id).toMatch(/^[0-9a-f-]{36}$/);
    aThread = data.thread_id;
    const { data: thread } = await admin
      .from("assistant_threads")
      .select("title, user_id")
      .eq("id", aThread)
      .single();
    expect(thread?.title).toBe("How do phases unlock?");
    expect(thread?.user_id).toBe(aId);
  });

  it("appends to an existing thread and counts down", async () => {
    const { data, error } = await send(a, "And the 50% rule?", aThread);
    expect(error).toBeNull();
    expect(data.thread_id).toBe(aThread);
    expect(data.remaining_today).toBe(23);
  });

  it("rejects empty and over-long content without inserting", async () => {
    const before = await userMessageCount(aId);
    const empty = await send(a, "   ", aThread);
    expect(empty.error?.message).toContain("INVALID_CONTENT");
    const long = await send(a, "x".repeat(2001), aThread);
    expect(long.error?.message).toContain("INVALID_CONTENT");
    expect(await userMessageCount(aId)).toBe(before);
  });

  it("refuses another student's thread", async () => {
    const { error } = await send(b, "sneaky", aThread);
    expect(error?.message).toContain("THREAD_NOT_FOUND");
    expect(await userMessageCount(bId)).toBe(0);
  });

  it("stops at the daily limit", async () => {
    const current = await userMessageCount(aId);
    // Bring the student to 24 used so the next send is the 25th and last.
    const filler = Array.from({ length: 24 - current }, () => ({
      thread_id: aThread,
      user_id: aId,
      role: "user",
      content: "filler",
    }));
    const { error: fillErr } = await admin
      .from("assistant_messages")
      .insert(filler);
    expect(fillErr).toBeNull();
    const last = await send(a, "message 25", aThread);
    expect(last.error).toBeNull();
    expect(last.data.remaining_today).toBe(0);
    const over = await send(a, "message 26", aThread);
    expect(over.error?.message).toContain("ASSISTANT_LIMIT_REACHED");
  });

  it("lets exactly one of two concurrent sends through at the boundary", async () => {
    await admin
      .from("assistant_messages")
      .delete()
      .eq("user_id", aId)
      .eq("content", "message 25");
    expect(await userMessageCount(aId)).toBe(24);
    const results = await Promise.all([
      send(a, "race 1", aThread),
      send(a, "race 2", aThread),
    ]);
    const ok = results.filter((r) => r.error === null);
    expect(ok).toHaveLength(1);
    expect(await userMessageCount(aId)).toBe(25);
  });
});

describe("assistant RLS", () => {
  it("hides another student's threads and messages", async () => {
    const threads = await b.from("assistant_threads").select("id");
    expect(threads.data).toEqual([]);
    const messages = await b.from("assistant_messages").select("id");
    expect(messages.data).toEqual([]);
  });

  it("shows a student their own messages", async () => {
    const { data, error } = await a
      .from("assistant_messages")
      .select("id")
      .eq("thread_id", aThread);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  it("blocks direct inserts by students", async () => {
    const { error } = await a.from("assistant_messages").insert({
      thread_id: aThread,
      user_id: aId,
      role: "assistant",
      content: "forged",
    });
    // 42501 = RLS denied, as opposed to "table does not exist".
    expect(error?.code).toBe("42501");
  });
});

describe("assistant_flag_message_v1", () => {
  let replyId: string;

  it("flags an assistant reply once, even when called twice", async () => {
    const { data: reply, error } = await admin
      .from("assistant_messages")
      .insert({
        thread_id: aThread,
        user_id: aId,
        role: "assistant",
        content: "Have you tried talking to a user?",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    replyId = reply!.id;
    const first = await a.rpc("assistant_flag_message_v1", {
      p_message_id: replyId,
    });
    expect(first.error).toBeNull();
    const second = await a.rpc("assistant_flag_message_v1", {
      p_message_id: replyId,
    });
    expect(second.error).toBeNull();
    const { count } = await admin
      .from("assistant_messages")
      .select("id", { count: "exact", head: true })
      .eq("flagged_message_id", replyId);
    expect(count).toBe(1);
  });

  it("refuses to flag a message in someone else's thread", async () => {
    const { error } = await b.rpc("assistant_flag_message_v1", {
      p_message_id: replyId,
    });
    expect(error?.message).toContain("MESSAGE_NOT_FOUND");
  });
});

describe("admin readers as a student", () => {
  it("return nothing", async () => {
    const stats = await a.rpc("get_assistant_admin_stats_v1");
    expect(stats.error).toBeNull();
    expect(stats.data).toBeNull();
    const threads = await a.rpc("get_assistant_admin_threads_v1", {
      p_flagged_only: false,
      p_user_id: null,
      p_limit: 50,
      p_offset: 0,
    });
    expect(threads.error).toBeNull();
    expect(threads.data).toEqual([]);
  });
});
