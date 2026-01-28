/**
 * Meeting Rewards Tests
 *
 * Tests that verify client meeting completion awards XP/points
 * and the 8-meeting threshold unlocks achievements.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getAdminClient,
  createTestUser,
  createTestTeam,
  addTestTeamMember,
  createTestClientMeeting,
  getUserStats,
} from "../setup";

describe("Meeting Rewards", () => {
  let team: { id: string; name: string };
  let founder: { id: string; name: string; email: string };
  let member: { id: string; name: string; email: string };

  beforeEach(async () => {
    // Create team with 2 members
    founder = await createTestUser({ name: "Meeting Founder" });
    member = await createTestUser({ name: "Meeting Member" });

    team = await createTestTeam(founder.id);
    await addTestTeamMember(team.id, member.id, "member");
  });

  it("should award XP to responsible user when meeting is completed", async () => {
    const sb = getAdminClient();

    // Get initial stats
    const founderBefore = await getUserStats(founder.id);

    // Create and complete a meeting
    const meeting = await createTestClientMeeting(team.id, founder.id, {
      status: "scheduled",
    });

    // Complete the meeting (triggers the award_client_meeting_rewards trigger)
    await sb
      .from("client_meetings")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", meeting.id);

    // Verify XP was awarded
    const founderAfter = await getUserStats(founder.id);

    // Meeting rewards: 50 XP (from award_client_meeting_rewards trigger)
    expect(founderAfter.total_xp).toBe(founderBefore.total_xp + 50);
  });

  it("should award points to responsible user when meeting is completed", async () => {
    const sb = getAdminClient();

    // Get initial stats
    const founderBefore = await getUserStats(founder.id);

    // Create and complete a meeting
    const meeting = await createTestClientMeeting(team.id, founder.id, {
      status: "scheduled",
    });

    // Complete the meeting
    await sb
      .from("client_meetings")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", meeting.id);

    // Verify points were awarded
    const founderAfter = await getUserStats(founder.id);

    // Meeting rewards: 25 points (from award_client_meeting_rewards trigger)
    expect(founderAfter.total_points).toBe(founderBefore.total_points + 25);
  });

  it("should unlock achievements after 8 client meetings", async () => {
    const sb = getAdminClient();

    // Create and complete 8 meetings
    for (let i = 0; i < 8; i++) {
      const meeting = await createTestClientMeeting(team.id, founder.id, {
        client_name: `Test Client ${i + 1}`,
        status: "scheduled",
      });

      await sb
        .from("client_meetings")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", meeting.id);
    }

    // Check achievement dashboard returns achievementsUnlocked = true
    const { data, error } = await sb.rpc("get_team_achievement_dashboard", {
      p_team_id: team.id,
      p_user_id: founder.id,
    });

    expect(error).toBeNull();
    // RPC returns array for TABLE functions
    const result = Array.isArray(data) ? data[0] : data;
    expect(result?.achievements_unlocked).toBe(true);
  });

  it("should NOT unlock achievements with only 7 meetings", async () => {
    const sb = getAdminClient();

    // Create and complete only 7 meetings
    for (let i = 0; i < 7; i++) {
      const meeting = await createTestClientMeeting(team.id, founder.id, {
        client_name: `Test Client ${i + 1}`,
        status: "scheduled",
      });

      await sb
        .from("client_meetings")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", meeting.id);
    }

    // Check achievement dashboard - should still be locked
    const { data, error } = await sb.rpc("get_team_achievement_dashboard", {
      p_team_id: team.id,
      p_user_id: founder.id,
    });

    expect(error).toBeNull();
    // RPC returns array for TABLE functions
    const result = Array.isArray(data) ? data[0] : data;
    expect(result?.achievements_unlocked).toBe(false);
  });

  it("should NOT award rewards for cancelled meetings", async () => {
    const sb = getAdminClient();

    // Get initial stats
    const founderBefore = await getUserStats(founder.id);

    // Create and cancel a meeting
    const meeting = await createTestClientMeeting(team.id, founder.id, {
      status: "scheduled",
    });

    // Cancel the meeting (not complete)
    await sb
      .from("client_meetings")
      .update({
        status: "cancelled",
      })
      .eq("id", meeting.id);

    // Verify NO rewards were awarded
    const founderAfter = await getUserStats(founder.id);

    expect(founderAfter.total_xp).toBe(founderBefore.total_xp);
    expect(founderAfter.total_points).toBe(founderBefore.total_points);
  });

  it("should create transaction record when meeting is completed", async () => {
    const sb = getAdminClient();

    // Create and complete a meeting
    const meeting = await createTestClientMeeting(team.id, founder.id, {
      client_name: "Transaction Test Client",
      status: "scheduled",
    });

    await sb
      .from("client_meetings")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", meeting.id);

    // Check transaction was created
    const { data: transactions } = await sb
      .from("transactions")
      .select("*")
      .eq("user_id", founder.id)
      .eq("type", "meeting")
      .like("description", "%Transaction Test Client%");

    expect(transactions).not.toBeNull();
    expect(transactions?.length).toBeGreaterThan(0);
    expect(transactions?.[0].xp_change).toBe(50);
    expect(transactions?.[0].points_change).toBe(25);
  });
});
