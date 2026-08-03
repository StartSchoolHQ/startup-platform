// Server-only data access for the diploma feature. Every function uses the
// service-role client — callers (API routes) are responsible for the admin
// check via requireAdmin(), except the student-own-diploma readers.

import { createAdminClient } from "@/lib/supabase/admin";
import { DIPLOMAS_BUCKET } from "./constants";
import type {
  BatchRow,
  DiplomaSnapshot,
  QwasarProgressRow,
  RpcDiplomaData,
} from "./types";

function admin() {
  return createAdminClient();
}

export async function getDiplomaData(userId: string): Promise<RpcDiplomaData> {
  const { data, error } = await admin().rpc("get_diploma_data", {
    p_user_id: userId,
  });
  if (error) throw error;
  return data as unknown as RpcDiplomaData;
}

export async function claimDiplomaNumber(batchId: string): Promise<string> {
  const { data, error } = await admin().rpc("claim_diploma_number", {
    p_batch_id: batchId,
  });
  if (error) throw error;
  if (!data) throw new Error("batch not found");
  return data as string;
}

export async function listDiplomaStudents() {
  const supa = admin();
  const [usersRes, teamsRes, diplomasRes] = await Promise.all([
    supa
      .from("users")
      .select(
        "id, name, email, qwasar_username, personal_code, startup_module_completed, primary_role"
      )
      .order("name"),
    supa
      .from("team_members")
      .select("user_id, teams(name)")
      .is("left_at", null),
    supa
      .from("diplomas")
      .select("user_id, diploma_number, issued_at, status")
      .eq("status", "issued"),
  ]);
  if (usersRes.error) throw usersRes.error;
  if (teamsRes.error) throw teamsRes.error;
  if (diplomasRes.error) throw diplomasRes.error;

  const teamByUser = new Map<string, string | null>();
  for (const tm of teamsRes.data ?? []) {
    const team = tm.teams as unknown as { name: string } | null;
    teamByUser.set(tm.user_id, team?.name ?? null);
  }
  const diplomaByUser = new Map<
    string,
    { diploma_number: string; issued_at: string }
  >();
  for (const d of diplomasRes.data ?? []) {
    diplomaByUser.set(d.user_id, {
      diploma_number: d.diploma_number,
      issued_at: d.issued_at,
    });
  }

  return (usersRes.data ?? [])
    .filter((u) => u.primary_role !== "admin")
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      qwasar_username: u.qwasar_username,
      personal_code: u.personal_code,
      startup_module_completed: u.startup_module_completed,
      team_name: teamByUser.get(u.id) ?? null,
      issued_diploma: diplomaByUser.get(u.id) ?? null,
    }));
}

export async function getDiplomaStudent(userId: string) {
  const { data, error } = await admin()
    .from("users")
    .select(
      "id, name, qwasar_username, personal_code, startup_module_completed"
    )
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateDiplomaStudent(input: {
  user_id: string;
  personal_code?: string | null;
  startup_module_completed?: boolean;
}) {
  const patch: Record<string, unknown> = {};
  if ("personal_code" in input) patch.personal_code = input.personal_code;
  if (input.startup_module_completed !== undefined) {
    patch.startup_module_completed = input.startup_module_completed;
  }
  const { error } = await admin()
    .from("users")
    .update(patch)
    .eq("id", input.user_id);
  if (error) throw error;
}

export async function listBatches(): Promise<BatchRow[]> {
  const { data, error } = await admin()
    .from("diploma_batches")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data as BatchRow[];
}

export async function getBatch(batchId: string): Promise<BatchRow> {
  const { data, error } = await admin()
    .from("diploma_batches")
    .select("*")
    .eq("id", batchId)
    .single();
  if (error) throw error;
  return data as BatchRow;
}

export async function upsertBatch(input: {
  id?: string;
  name: string;
  admission_date: string | null;
  completion_date: string | null;
  number_prefix: string;
}) {
  const supa = admin();
  if (input.id) {
    const { error } = await supa
      .from("diploma_batches")
      .update({
        name: input.name,
        admission_date: input.admission_date,
        completion_date: input.completion_date,
        number_prefix: input.number_prefix,
      })
      .eq("id", input.id);
    if (error) throw error;
    return;
  }
  const { error } = await supa.from("diploma_batches").insert({
    name: input.name,
    admission_date: input.admission_date,
    completion_date: input.completion_date,
    number_prefix: input.number_prefix,
  });
  if (error) throw error;
}

export async function upsertQwasarProgress(rows: QwasarProgressRow[]) {
  const supa = admin();
  const syncedAt = new Date().toISOString();
  let upserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => ({
      ...r,
      synced_at: syncedAt,
    }));
    const { error } = await supa
      .from("qwasar_progress")
      .upsert(chunk, { onConflict: "qwasar_login,track" });
    if (error) throw error;
    upserted += chunk.length;
  }
  return { upserted };
}

export async function applyUsernameMapping(
  rows: { email: string; login: string }[]
) {
  const supa = admin();
  const emails = rows.map((r) => r.email);
  const { data: existing, error } = await supa
    .from("users")
    .select("id, email")
    .in("email", emails);
  if (error) throw error;

  const byEmail = new Map(
    (existing ?? []).map((u) => [u.email.toLowerCase(), u.id])
  );
  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const row of rows) {
    const userId = byEmail.get(row.email);
    if (!userId) {
      unmatched.push(row.email);
      continue;
    }
    const { error: updateError } = await supa
      .from("users")
      .update({ qwasar_username: row.login })
      .eq("id", userId);
    if (updateError) throw updateError;
    matched.push(row.email);
  }
  return { matched, unmatched };
}

export async function issueDiploma(input: {
  userId: string;
  batchId: string;
  adminId: string;
  pdf: Buffer;
  snapshot: DiplomaSnapshot;
  diplomaNumber: string;
  diplomaType: "full" | "tech_only";
}) {
  const supa = admin();
  const storagePath = `issued/${input.userId}/${input.diplomaNumber}.pdf`;

  const { error: uploadError } = await supa.storage
    .from(DIPLOMAS_BUCKET)
    .upload(storagePath, input.pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { data, error } = await supa
    .from("diplomas")
    .insert({
      diploma_number: input.diplomaNumber,
      user_id: input.userId,
      batch_id: input.batchId,
      diploma_type: input.diplomaType,
      snapshot: JSON.parse(JSON.stringify(input.snapshot)),
      storage_path: storagePath,
      issued_by: input.adminId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function supersedeDiploma(id: string) {
  const { error } = await admin()
    .from("diplomas")
    .update({ status: "superseded" })
    .eq("id", id);
  if (error) throw error;
}

export async function listIssuedDiplomas() {
  const { data, error } = await admin()
    .from("diplomas")
    .select(
      "id, diploma_number, diploma_type, issued_at, status, storage_path, users!diplomas_user_id_fkey(name, email)"
    )
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getOwnIssuedDiploma(userId: string) {
  const { data, error } = await admin()
    .from("diplomas")
    .select("id, diploma_number, issued_at, storage_path")
    .eq("user_id", userId)
    .eq("status", "issued")
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createDiplomaSignedUrl(storagePath: string) {
  const { data, error } = await admin()
    .storage.from(DIPLOMAS_BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error || !data) throw error ?? new Error("signed url failed");
  return data.signedUrl;
}

export async function countQwasarRows(qwasarLogin: string) {
  const { count, error } = await admin()
    .from("qwasar_progress")
    .select("id", { count: "exact", head: true })
    .eq("qwasar_login", qwasarLogin);
  if (error) throw error;
  return count ?? 0;
}
