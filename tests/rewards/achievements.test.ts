/**
 * Achievement Completion Tests
 *
 * Tests that verify achievements unlock correctly and
 * XP/points are split among team members.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getAdminClient,
  createTestUser,
  createTestTeam,
  addTestTeamMember,
  getUserStats,
  getAnyAchievementId,
  trackTeamAchievement,
} from "../setup";

describe("Achievement Completion", () => {
  let team: { id: string; name: string };
  let founder: { id: string; name: string; email: string };
  let member1: { id: string; name: string; email: string };
  let member2: { id: string; name: string; email: string };
  let achievement: {
    id: string;
    name: string;
    xp_reward: number;
    points_reward: number;
  };

  beforeEach(async () => {
    // Create 3-member team
    founder = await createTestUser({ name: "Achievement Founder" });
    member1 = await createTestUser({ name: "Achievement Member 1" });
    member2 = await createTestUser({ name: "Achievement Member 2" });

    team = await createTestTeam(founder.id);
    await addTestTeamMember(team.id, member1.id, "member");
    await addTestTeamMember(team.id, member2.id, "member");

    // Get a real achievement
    achievement = await getAnyAchievementId();
  });

  it("should create team_achievements record when achievement completes", async () => {
    const sb = getAdminClient();

    // Call the achievement completion RPC
    const { data, error } = await sb.rpc("complete_team_achievement", {
      p_team_id: team.id,
      p_achievement_id: achievement.id,
    });

    // Track for cleanup
    if (data?.achievement_id) {
      trackTeamAchievement(data.achievement_id);
    }

    expect(error).toBeNull();

    // Verify team_achievements record was created
    const { data: teamAchievement } = await sb
      .from("team_achievements")
      .select("*")
      .eq("team_id", team.id)
      .eq("achievement_id", achievement.id)
      .single();

    expect(teamAchievement).not.toBeNull();
    expect(teamAchievement?.completed_at).not.toBeNull();
  });

  it("should split XP equally among 3 team members", async () => {
    const sb = getAdminClient();

    // Get initial stats
    const founderBefore = await getUserStats(founder.id);
    const member1Before = await getUserStats(member1.id);
    const member2Before = await getUserStats(member2.id);

    // Complete the achievement
    const { data, error } = await sb.rpc("complete_team_achievement", {
      p_team_id: team.id,
      p_achievement_id: achievement.id,
    });

    if (data?.achievement_id) {
      trackTeamAchievement(data.achievement_id);
    }

    expect(error).toBeNull();

    // Get final stats
    const founderAfter = await getUserStats(founder.id);
    const member1After = await getUserStats(member1.id);
    const member2After = await getUserStats(member2.id);

    // Calculate expected split (3 members)
    const expectedXpPerMember = Math.floor(achievement.xp_reward / 3);

    // Each member should have received approximately equal XP
    const founderXpGain = founderAfter.total_xp - founderBefore.total_xp;
    const member1XpGain = member1After.total_xp - member1Before.total_xp;
    const member2XpGain = member2After.total_xp - member2Before.total_xp;

    // Allow for rounding differences
    expect(founderXpGain).toBeGreaterThanOrEqual(expectedXpPerMember - 1);
    expect(founderXpGain).toBeLessThanOrEqual(expectedXpPerMember + 1);
    expect(member1XpGain).toBeGreaterThanOrEqual(expectedXpPerMember - 1);
    expect(member2XpGain).toBeGreaterThanOrEqual(expectedXpPerMember - 1);
  });

  it("should NOT allow duplicate achievement completion", async () => {
    const sb = getAdminClient();

    // Complete achievement first time
    const { data: firstCompletion } = await sb.rpc(
      "complete_team_achievement",
      {
        p_team_id: team.id,
        p_achievement_id: achievement.id,
      }
    );

    if (firstCompletion?.achievement_id) {
      trackTeamAchievement(firstCompletion.achievement_id);
    }

    // Try to complete again
    const { error } = await sb.rpc("complete_team_achievement", {
      p_team_id: team.id,
      p_achievement_id: achievement.id,
    });

    // Should fail or return indication it's already completed
    // The exact behavior depends on your function implementation
    // Either error is thrown OR no duplicate record is created
    const { data: duplicateCheck } = await sb
      .from("team_achievements")
      .select("id")
      .eq("team_id", team.id)
      .eq("achievement_id", achievement.id);

    // Should only have 1 record, not 2
    expect(duplicateCheck?.length).toBe(1);
  });

  it("should distribute points equally among team members", async () => {
    const sb = getAdminClient();

    // Get initial stats
    const founderBefore = await getUserStats(founder.id);
    const member1Before = await getUserStats(member1.id);

    // Complete the achievement
    const { data, error } = await sb.rpc("complete_team_achievement", {
      p_team_id: team.id,
      p_achievement_id: achievement.id,
    });

    if (data?.achievement_id) {
      trackTeamAchievement(data.achievement_id);
    }

    expect(error).toBeNull();

    // Get final stats
    const founderAfter = await getUserStats(founder.id);
    const member1After = await getUserStats(member1.id);

    // Calculate expected split
    const expectedPointsPerMember = Math.floor(achievement.points_reward / 3);

    const founderPointsGain =
      founderAfter.total_points - founderBefore.total_points;
    const member1PointsGain =
      member1After.total_points - member1Before.total_points;

    // Allow for rounding differences
    expect(founderPointsGain).toBeGreaterThanOrEqual(
      expectedPointsPerMember - 1
    );
    expect(member1PointsGain).toBeGreaterThanOrEqual(
      expectedPointsPerMember - 1
    );
  });
});
