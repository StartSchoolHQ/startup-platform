import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Batch scope for the Team Journey admin pages.
 *
 * `null` means "current cohort": users and teams with status = 'active'.
 * A uuid means that diploma batch (users.batch_id / teams.batch_id), which is
 * how an archived cohort stays reachable. Archived rows therefore never count
 * by default. Mirrors `_admin_scope_users` / `_admin_scope_teams` in SQL.
 */
const uuid = z.string().uuid();

/** Reads `?batch=` from a request. Anything that is not a uuid means current. */
export function parseBatchParam(
  searchParams: URLSearchParams | { get(name: string): string | null }
): string | null {
  const raw = searchParams.get("batch");
  if (!raw) return null;
  const parsed = uuid.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export interface ScopeIds {
  userIds: string[];
  teamIds: string[];
}

/**
 * Resolves the scope to explicit id lists for routes that query tables with
 * PostgREST filters instead of an RPC. Uses the admin client because RLS hides
 * archived users from admins.
 */
export async function resolveScopeIds(
  admin: SupabaseClient,
  batchId: string | null
): Promise<ScopeIds> {
  const usersQ = admin.from("users").select("id").eq("primary_role", "user");
  const teamsQ = admin.from("teams").select("id, name");

  const [users, teams] = await Promise.all([
    batchId ? usersQ.eq("batch_id", batchId) : usersQ.eq("status", "active"),
    batchId ? teamsQ.eq("batch_id", batchId) : teamsQ.eq("status", "active"),
  ]);

  if (users.error) throw users.error;
  if (teams.error) throw teams.error;

  return {
    userIds: (users.data ?? []).map((u) => u.id as string),
    teamIds: (teams.data ?? [])
      .filter(
        (t) =>
          !String(t.name ?? "")
            .toUpperCase()
            .startsWith("[TEST]")
      )
      .map((t) => t.id as string),
  };
}
