/**
 * V5 Team Reward Distribution Tests
 *
 * Verifies distribute_team_rewards_v2 applies the correct upmark factor
 * for each team size and updates both users.total_points and transactions.
 */

import { describe, it, expect } from "vitest";
import {
  getAdminClient,
  createTestUser,
  createTestTeam,
  addTestTeamMember,
  getUserStats,
  getAnyTaskId,
} from "../setup";

describe("V5 team reward distribution", () => {
  it("solo team (size 1) gets full base reward, factor 1.00", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Solo Founder" });
    // createTestTeam adds founder as member automatically
    const team = await createTestTeam(founder.id);
    const taskId = await getAnyTaskId();

    const { data, error } = await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 200,
      p_points_amount: 240,
      p_task_id: taskId,
      p_task_title: "V5 Solo Test",
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.member_count).toBe(1);
    expect(Number(data.upmark_factor)).toBe(1.0);
    expect(data.points_per_member).toBe(240);
    expect(data.xp_per_member).toBe(200);

    const stats = await getUserStats(founder.id);
    expect(stats.total_points).toBe(240);
    expect(stats.total_xp).toBe(200);
  });

  it("duo team (size 2) gets base/2 * 1.30 per member", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Duo Founder" });
    const member = await createTestUser({ name: "V5 Duo Member" });
    const team = await createTestTeam(founder.id);
    await addTestTeamMember(team.id, member.id, "member");
    const taskId = await getAnyTaskId();

    const { data, error } = await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 200,
      p_points_amount: 240,
      p_task_id: taskId,
      p_task_title: "V5 Duo Test",
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.member_count).toBe(2);
    expect(Number(data.upmark_factor)).toBe(1.3);
    // 240/2 = 120, * 1.30 = 156
    expect(data.points_per_member).toBe(156);
    // 200/2 = 100, * 1.30 = 130
    expect(data.xp_per_member).toBe(130);

    const founderStats = await getUserStats(founder.id);
    const memberStats = await getUserStats(member.id);
    expect(founderStats.total_points).toBe(156);
    expect(memberStats.total_points).toBe(156);
  });

  it("trio team (size 3) gets base/3 * 1.50 per member", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Trio Founder" });
    const m1 = await createTestUser({ name: "V5 Trio M1" });
    const m2 = await createTestUser({ name: "V5 Trio M2" });
    const team = await createTestTeam(founder.id);
    await addTestTeamMember(team.id, m1.id, "member");
    await addTestTeamMember(team.id, m2.id, "member");
    const taskId = await getAnyTaskId();

    const { data, error } = await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 200,
      p_points_amount: 240,
      p_task_id: taskId,
      p_task_title: "V5 Trio Test",
    });

    expect(error).toBeNull();
    expect(data.member_count).toBe(3);
    expect(Number(data.upmark_factor)).toBe(1.5);
    // 240/3 = 80, * 1.50 = 120
    expect(data.points_per_member).toBe(120);
  });

  it("quad team (size 4) gets base/4 * 1.70 per member", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Quad Founder" });
    const m1 = await createTestUser({ name: "V5 Quad M1" });
    const m2 = await createTestUser({ name: "V5 Quad M2" });
    const m3 = await createTestUser({ name: "V5 Quad M3" });
    const team = await createTestTeam(founder.id);
    await addTestTeamMember(team.id, m1.id, "member");
    await addTestTeamMember(team.id, m2.id, "member");
    await addTestTeamMember(team.id, m3.id, "member");
    const taskId = await getAnyTaskId();

    const { data, error } = await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 200,
      p_points_amount: 240,
      p_task_id: taskId,
      p_task_title: "V5 Quad Test",
    });

    expect(error).toBeNull();
    expect(data.member_count).toBe(4);
    expect(Number(data.upmark_factor)).toBe(1.7);
    // 240/4 = 60, * 1.70 = 102
    expect(data.points_per_member).toBe(102);
  });

  it("inserts transactions with V5 metadata for every member", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Tx Founder" });
    const member = await createTestUser({ name: "V5 Tx Member" });
    const team = await createTestTeam(founder.id);
    await addTestTeamMember(team.id, member.id, "member");
    const taskId = await getAnyTaskId();

    await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 100,
      p_points_amount: 200,
      p_task_id: taskId,
      p_task_title: "V5 Tx Test",
    });

    const { data: txns } = await sb
      .from("transactions")
      .select("user_id, points_change, metadata")
      .eq("team_id", team.id)
      .eq("type", "task");

    expect(txns).toHaveLength(2);
    for (const t of txns ?? []) {
      expect(t.points_change).toBe(130); // (200/2)*1.30
      const meta = t.metadata as Record<string, unknown>;
      expect(meta.distribution_version).toBe("v2");
      expect(Number(meta.upmark_factor)).toBe(1.3);
      expect(meta.team_member_count).toBe(2);
    }
  });

  it("returns error for team with no active members", async () => {
    const sb = getAdminClient();
    const founder = await createTestUser({ name: "V5 Empty Founder" });
    const team = await createTestTeam(founder.id);

    // Soft-remove the auto-added founder so the team has no active members
    await sb
      .from("team_members")
      .update({ left_at: new Date().toISOString() })
      .eq("team_id", team.id)
      .eq("user_id", founder.id);

    const { data } = await sb.rpc("distribute_team_rewards_v2", {
      p_team_id: team.id,
      p_xp_amount: 100,
      p_points_amount: 100,
    });

    expect(data.success).toBe(false);
    expect(data.error).toContain("No active team members");
  });
});
