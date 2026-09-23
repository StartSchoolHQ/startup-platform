/**
 * Locks the contract the support ticket route depends on: the owner-only
 * storage policies on the `support-attachments` bucket and the owner-insert
 * / owner-select policies on `support_tickets`. Creates ONE auth user
 * (test_tkt_*@test.local), acts as that student through the anon client,
 * and deletes every row/object it created. Runs against the production
 * project like the other RPC tests.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EMAIL = `test_tkt_${Date.now()}@test.local`;
const PASSWORD = `Test-${crypto.randomUUID()}`;
const RANDOM_ID = "00000000-0000-4000-8000-000000000000";
const BUCKET = "support-attachments";

let admin: SupabaseClient;
let student: SupabaseClient;
let userId: string;
let ticketId: string;

async function purgeOrphans(): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const u of data.users.filter((x) => x.email?.startsWith("test_tkt_"))) {
    const { data: objects } = await admin.storage.from(BUCKET).list(u.id, {
      limit: 1000,
    });
    if (objects?.length) {
      // Orphaned uploads are nested under <userId>/<ticketId>/<file> — list
      // recursively one level down before removing.
      const paths: string[] = [];
      for (const entry of objects) {
        const { data: nested } = await admin.storage
          .from(BUCKET)
          .list(`${u.id}/${entry.name}`, { limit: 1000 });
        for (const file of nested ?? []) {
          paths.push(`${u.id}/${entry.name}/${file.name}`);
        }
      }
      if (paths.length) await admin.storage.from(BUCKET).remove(paths);
    }
    await admin.from("support_tickets").delete().eq("user_id", u.id);
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
  ticketId = crypto.randomUUID();
  const { error: upsertErr } = await admin.from("users").upsert({
    id: userId,
    name: "test_tkt_student",
    email: EMAIL,
    primary_role: "user",
    status: "active",
  });
  if (upsertErr) throw upsertErr;

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
  const ownPath = `${userId}/${ticketId}`;
  const { data: objects } = await admin.storage.from(BUCKET).list(ownPath, {
    limit: 1000,
  });
  if (objects?.length) {
    await admin.storage
      .from(BUCKET)
      .remove(objects.map((o) => `${ownPath}/${o.name}`));
  }
  const { data: remaining } = await admin.storage.from(BUCKET).list(ownPath, {
    limit: 1000,
  });
  expect(remaining?.length ?? 0).toBe(0);

  await admin.from("support_tickets").delete().eq("user_id", userId);
  const { count: ticketCount } = await admin
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  expect(ticketCount).toBe(0);

  await admin.from("users").delete().eq("id", userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
});

describe("support-attachments storage policies", () => {
  it("lets the owner upload under their own folder", async () => {
    const path = `${userId}/${ticketId}/${Date.now()}-note.txt`;
    const { error } = await student.storage
      .from(BUCKET)
      .upload(path, new Blob(["hello support"], { type: "text/plain" }), {
        contentType: "text/plain",
      });
    expect(error).toBeNull();
  });

  it("blocks the owner from uploading under another folder", async () => {
    const path = `${RANDOM_ID}/${ticketId}/x.txt`;
    const { error } = await student.storage
      .from(BUCKET)
      .upload(path, new Blob(["nope"], { type: "text/plain" }), {
        contentType: "text/plain",
      });
    expect(error).not.toBeNull();
  });
});

describe("support_tickets policies", () => {
  it("lets the owner insert a ticket referencing their own upload", async () => {
    const path = `${userId}/${ticketId}/${Date.now()}-note.txt`;
    const { error: insertError } = await student
      .from("support_tickets")
      .insert({
        id: ticketId,
        user_id: userId,
        priority: "medium",
        category: "Bug Report",
        title: "test_tkt storage check",
        description: "Ten+ character description for the policy test.",
        attachments: [{ path, name: "note.txt", size: 13, type: "text/plain" }],
      });
    expect(insertError).toBeNull();

    const { data: row, error: selectError } = await student
      .from("support_tickets")
      .select("id, status, attachments")
      .eq("id", ticketId)
      .single();
    expect(selectError).toBeNull();
    expect(row!.status).toBe("open");
    expect(Array.isArray(row!.attachments) ? row!.attachments.length : 0).toBe(
      1
    );
  });

  it("rejects an insert impersonating another user_id", async () => {
    const { error } = await student.from("support_tickets").insert({
      id: crypto.randomUUID(),
      user_id: RANDOM_ID,
      priority: "medium",
      category: "Bug Report",
      title: "test_tkt impersonation check",
      description: "Ten+ character description for the policy test.",
      attachments: [],
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("42501");
  });

  it("never returns rows to an anonymous, signed-out client", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await anon.from("support_tickets").select("id");
    if (error) {
      expect(error).not.toBeNull();
    } else {
      expect(data).toHaveLength(0);
    }
  });
});
