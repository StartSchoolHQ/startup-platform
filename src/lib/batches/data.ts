// Batch close/reopen. The DB is the source of truth (RPC runs first, in one
// transaction); the auth ban is a re-runnable side effect. Server-only.
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BanFailure,
  BatchClosePreview,
  CloseBatchResult,
  ReopenBatchResult,
  RetryBansResult,
} from "./types";

// ~100 years. Supabase has no "permanent" literal; 'none' lifts a ban.
export const PERMANENT_BAN = "876000h";

const admin = () => createAdminClient();

export async function getClosePreview(): Promise<BatchClosePreview> {
  const { data, error } = await admin().rpc("get_batch_close_preview_v1");
  if (error) throw new Error(`Preview failed: ${error.message}`);
  return data as unknown as BatchClosePreview;
}

async function setBan(userIds: string[], duration: string) {
  const supa = admin();
  const failures: BanFailure[] = [];
  let ok = 0;
  for (const id of userIds) {
    const { error } = await supa.auth.admin.updateUserById(id, {
      ban_duration: duration,
    });
    if (error) {
      const { data } = await supa
        .from("users")
        .select("email")
        .eq("id", id)
        .maybeSingle();
      failures.push({ id, email: data?.email ?? null, error: error.message });
    } else {
      ok++;
    }
  }
  return { ok, failures };
}

async function batchStudentIds(batchId: string): Promise<string[]> {
  const { data, error } = await admin()
    .from("users")
    .select("id")
    .eq("batch_id", batchId)
    .eq("primary_role", "user");
  if (error) throw new Error(`Batch users lookup failed: ${error.message}`);
  return (data ?? []).map((r) => r.id);
}

export async function closeBatch(
  batchId: string,
  userIds: string[],
  teamIds: string[]
): Promise<CloseBatchResult> {
  const { data, error } = await admin().rpc("close_batch_v1", {
    p_batch_id: batchId,
    p_user_ids: userIds,
    p_team_ids: teamIds,
  });
  if (error) throw new Error(error.message);
  const counts = data as unknown as {
    users_archived: number;
    teams_archived: number;
  };
  const { ok, failures } = await setBan(userIds, PERMANENT_BAN);
  return { ...counts, banned: ok, banFailures: failures };
}

export async function reopenBatch(batchId: string): Promise<ReopenBatchResult> {
  const ids = await batchStudentIds(batchId);
  const { data, error } = await admin().rpc("reopen_batch_v1", {
    p_batch_id: batchId,
  });
  if (error) throw new Error(error.message);
  const counts = data as unknown as {
    users_reopened: number;
    teams_reopened: number;
  };
  const { ok, failures } = await setBan(ids, "none");
  return { ...counts, unbanned: ok, banFailures: failures };
}

export async function retryBans(batchId: string): Promise<RetryBansResult> {
  const supa = admin();
  const ids = await batchStudentIds(batchId);
  if (ids.length === 0) return { banned: 0, alreadyBanned: 0, banFailures: [] };
  const { data: archived, error } = await supa
    .from("users")
    .select("id")
    .in("id", ids)
    .eq("status", "archived");
  if (error) throw new Error(`Archived users lookup failed: ${error.message}`);
  let alreadyBanned = 0;
  const toBan: string[] = [];
  for (const { id } of archived ?? []) {
    const { data } = await supa.auth.admin.getUserById(id);
    // banned_until is returned by GoTrue but missing from this auth-js
    // version's User type.
    const bannedUntil = (data?.user as { banned_until?: string } | null)
      ?.banned_until;
    const until = bannedUntil ? new Date(bannedUntil) : null;
    if (until && until > new Date()) alreadyBanned++;
    else toBan.push(id);
  }
  const { ok, failures } = await setBan(toBan, PERMANENT_BAN);
  return { banned: ok, alreadyBanned, banFailures: failures };
}
