/**
 * Integration tests for close_batch_v1 / reopen_batch_v1 /
 * get_batch_close_preview_v1 against the real project (service role).
 * Uses its own test_ batch; never touches Mercury-Redstone.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addTestTeamMember,
  createTestTeam,
  createTestUser,
  getAdminClient,
} from "./setup";

let batchId: string;

async function createTestBatch() {
  const { data, error } = await getAdminClient()
    .from("diploma_batches")
    .insert({ name: `test_batch_${Date.now()}`, number_prefix: "TST" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

beforeEach(async () => {
  batchId = await createTestBatch();
});

afterEach(async () => {
  const sb = getAdminClient();
  // Untag before the global cleanup deletes users/teams (FK restrict).
  await sb.from("users").update({ batch_id: null }).eq("batch_id", batchId);
  await sb.from("teams").update({ batch_id: null }).eq("batch_id", batchId);
  const { error } = await sb.from("diploma_batches").delete().eq("id", batchId);
  if (error) throw new Error(`batch cleanup failed: ${error.message}`);
});

describe("close_batch_v1", () => {
  it("archives exactly the given users/teams, tags batch, sets closed_at", async () => {
    const sb = getAdminClient();
    const a = await createTestUser();
    const b = await createTestUser();
    const team = await createTestTeam(a.id);
    const untouched = await createTestTeam(b.id);

    const { data, error } = await sb.rpc("close_batch_v1", {
      p_batch_id: batchId,
      p_user_ids: [a.id],
      p_team_ids: [team.id],
    });
    expect(error).toBeNull();
    expect(data).toEqual({ users_archived: 1, teams_archived: 1 });

    const { data: ua } = await sb
      .from("users")
      .select("status,batch_id")
      .eq("id", a.id)
      .single();
    const { data: ub } = await sb
      .from("users")
      .select("status,batch_id")
      .eq("id", b.id)
      .single();
    const { data: t1 } = await sb
      .from("teams")
      .select("status,batch_id,archived_at")
      .eq("id", team.id)
      .single();
    const { data: t2 } = await sb
      .from("teams")
      .select("status,batch_id")
      .eq("id", untouched.id)
      .single();
    const { data: batch } = await sb
      .from("diploma_batches")
      .select("closed_at")
      .eq("id", batchId)
      .single();

    expect(ua).toEqual({ status: "archived", batch_id: batchId });
    expect(ub).toEqual({ status: "active", batch_id: null });
    expect(t1?.status).toBe("archived");
    expect(t1?.batch_id).toBe(batchId);
    expect(t1?.archived_at).not.toBeNull();
    expect(t2).toEqual({ status: "active", batch_id: null });
    expect(batch?.closed_at).not.toBeNull();
  });

  it("does not touch an already-archived team's archived_at", async () => {
    const sb = getAdminClient();
    const a = await createTestUser();
    const old = await createTestTeam(a.id, { status: "archived" });
    const before = "2026-01-01T00:00:00.000Z";
    await sb.from("teams").update({ archived_at: before }).eq("id", old.id);

    const { data } = await sb.rpc("close_batch_v1", {
      p_batch_id: batchId,
      p_user_ids: [],
      p_team_ids: [old.id],
    });
    expect(data).toEqual({ users_archived: 0, teams_archived: 0 });
    const { data: t } = await sb
      .from("teams")
      .select("archived_at,batch_id")
      .eq("id", old.id)
      .single();
    expect(new Date(t!.archived_at!).toISOString()).toBe(before);
    expect(t?.batch_id).toBeNull();
  });

  it("refuses admin accounts and already-closed batches", async () => {
    const sb = getAdminClient();
    const admin = await createTestUser({ primary_role: "admin" });
    const { error: e1 } = await sb.rpc("close_batch_v1", {
      p_batch_id: batchId,
      p_user_ids: [admin.id],
      p_team_ids: [],
    });
    expect(e1?.message).toMatch(/admin/i);

    await sb.rpc("close_batch_v1", {
      p_batch_id: batchId,
      p_user_ids: [],
      p_team_ids: [],
    });
    const { error: e2 } = await sb.rpc("close_batch_v1", {
      p_batch_id: batchId,
      p_user_ids: [],
      p_team_ids: [],
    });
    expect(e2?.message).toMatch(/already closed/i);
  });
});

describe("reopen_batch_v1", () => {
  it("restores only rows archived by the close", async () => {
    const sb = getAdminClient();
    const a = await createTestUser();
    const oldFounder = await createTestUser();
    const team = await createTestTeam(a.id);
    const old = await createTestTeam(oldFounder.id, { status: "archived" });
    await sb
      .from("teams")
      .update({ archived_at: "2026-01-01T00:00:00.000Z", batch_id: batchId })
      .eq("id", old.id);

    await sb.rpc("close_batch_v1", {
      p_batch_id: batchId,
      p_user_ids: [a.id],
      p_team_ids: [team.id],
    });
    const { data, error } = await sb.rpc("reopen_batch_v1", {
      p_batch_id: batchId,
    });
    expect(error).toBeNull();
    expect(data).toEqual({ users_reopened: 1, teams_reopened: 1 });

    const { data: u } = await sb
      .from("users")
      .select("status,batch_id")
      .eq("id", a.id)
      .single();
    const { data: t } = await sb
      .from("teams")
      .select("status,archived_at")
      .eq("id", team.id)
      .single();
    const { data: o } = await sb
      .from("teams")
      .select("status")
      .eq("id", old.id)
      .single();
    const { data: b } = await sb
      .from("diploma_batches")
      .select("closed_at")
      .eq("id", batchId)
      .single();
    expect(u).toEqual({ status: "active", batch_id: batchId });
    expect(t).toEqual({ status: "active", archived_at: null });
    expect(o?.status).toBe("archived");
    expect(b?.closed_at).toBeNull();
  });
});

describe("get_batch_close_preview_v1", () => {
  it("lists untagged + this-batch students and active teams, flags admin teams", async () => {
    const sb = getAdminClient();
    const student = await createTestUser();
    const admin = await createTestUser({ primary_role: "admin" });
    const tagged = await createTestUser();
    await sb.from("users").update({ batch_id: batchId }).eq("id", tagged.id);
    const otherBatch = await createTestUser();
    const { data: ob } = await sb
      .from("diploma_batches")
      .insert({ name: `test_other_${Date.now()}`, number_prefix: "TSO" })
      .select("id")
      .single();
    await sb.from("users").update({ batch_id: ob!.id }).eq("id", otherBatch.id);
    const studentTeam = await createTestTeam(student.id);
    const adminTeam = await createTestTeam(admin.id);
    const helper = await createTestUser();
    await addTestTeamMember(adminTeam.id, helper.id);

    const { data, error } = await sb.rpc("get_batch_close_preview_v1", {
      p_batch_id: batchId,
    });
    expect(error).toBeNull();
    const preview = data as unknown as {
      users: { id: string; team_names: string[] }[];
      teams: { id: string; has_admin_member: boolean }[];
    };
    const s = preview.users.find((u) => u.id === student.id);
    expect(s?.team_names).toEqual([studentTeam.name]);
    const h = preview.users.find((u) => u.id === helper.id);
    expect(h?.team_names).toEqual([adminTeam.name]);
    expect(preview.users.find((u) => u.id === admin.id)).toBeUndefined();
    // Pre-tagged with THIS batch: included. Tagged with another: excluded.
    expect(preview.users.find((u) => u.id === tagged.id)).toBeDefined();
    expect(preview.users.find((u) => u.id === otherBatch.id)).toBeUndefined();
    await sb.from("users").update({ batch_id: null }).eq("id", otherBatch.id);
    await sb.from("diploma_batches").delete().eq("id", ob!.id);
    expect(
      preview.teams.find((t) => t.id === studentTeam.id)?.has_admin_member
    ).toBe(false);
    expect(
      preview.teams.find((t) => t.id === adminTeam.id)?.has_admin_member
    ).toBe(true);
  });
});

describe("archived rows drop out of live surfaces", () => {
  it("leaderboard and missed-report check ignore archived", async () => {
    const sb = getAdminClient();
    const a = await createTestUser({ total_xp: 999999 });
    const team = await createTestTeam(a.id);
    await sb.rpc("close_batch_v1", {
      p_batch_id: batchId,
      p_user_ids: [a.id],
      p_team_ids: [team.id],
    });
    const { data: lb } = await sb.rpc("get_live_leaderboard_data");
    const lbRows = (lb ?? []) as { id?: string; user_id?: string }[];
    expect(lbRows.some((r) => (r.id ?? r.user_id) === a.id)).toBe(false);
    const { data: missed } = await sb.rpc(
      "check_missed_weekly_reports_team_context"
    );
    const missedRows = (missed ?? []) as { team_id: string }[];
    expect(missedRows.some((r) => r.team_id === team.id)).toBe(false);
  });
});
