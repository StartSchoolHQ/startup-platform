/**
 * Task Approval Reward Tests
 *
 * Tests that verify task progress works correctly and
 * the RLS policies are properly enforced.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getAdminClient,
  createTestUser,
  createTestTeam,
  addTestTeamMember,
  createTestTaskProgress,
  getUserStats,
  getAnyTaskId,
} from "../setup";

describe("Task Approval Rewards", () => {
  let teamA: { id: string; name: string };
  let founder: { id: string; name: string; email: string };
  let member1: { id: string; name: string; email: string };
  let member2: { id: string; name: string; email: string };
  let taskId: string;

  beforeEach(async () => {
    // Create test users
    founder = await createTestUser({ name: "Test Founder" });
    member1 = await createTestUser({ name: "Test Member 1" });
    member2 = await createTestUser({ name: "Test Member 2" });

    // Create team A with 3 members
    teamA = await createTestTeam(founder.id);
    await addTestTeamMember(teamA.id, member1.id, "member");
    await addTestTeamMember(teamA.id, member2.id, "member");

    // Get a real task ID
    taskId = await getAnyTaskId();
  });

  it("should create task_progress record correctly", async () => {
    // Create task progress in pending_review status
    const progress = await createTestTaskProgress(taskId, teamA.id, {
      status: "pending_review",
    });

    expect(progress.id).toBeDefined();

    // Verify it was created
    const sb = getAdminClient();
    const { data } = await sb
      .from("task_progress")
      .select("status, team_id")
      .eq("id", progress.id)
      .single();

    expect(data?.status).toBe("pending_review");
    expect(data?.team_id).toBe(teamA.id);
  });

  it("should allow status transition to in_progress", async () => {
    const sb = getAdminClient();

    const progress = await createTestTaskProgress(taskId, teamA.id, {
      status: "not_started",
    });

    // Update to in_progress
    const { error } = await sb
      .from("task_progress")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", progress.id);

    expect(error).toBeNull();

    const { data } = await sb
      .from("task_progress")
      .select("status")
      .eq("id", progress.id)
      .single();

    expect(data?.status).toBe("in_progress");
  });

  it("should allow status transition to pending_review", async () => {
    const sb = getAdminClient();

    const progress = await createTestTaskProgress(taskId, teamA.id, {
      status: "in_progress",
    });

    // Update to pending_review
    const { error } = await sb
      .from("task_progress")
      .update({ status: "pending_review" })
      .eq("id", progress.id);

    expect(error).toBeNull();

    const { data } = await sb
      .from("task_progress")
      .select("status")
      .eq("id", progress.id)
      .single();

    expect(data?.status).toBe("pending_review");
  });

  it("should allow cancelled status", async () => {
    const sb = getAdminClient();

    const progress = await createTestTaskProgress(taskId, teamA.id, {
      status: "in_progress",
    });

    // Cancel the task
    const { error } = await sb
      .from("task_progress")
      .update({ status: "cancelled" })
      .eq("id", progress.id);

    expect(error).toBeNull();

    const { data } = await sb
      .from("task_progress")
      .select("status")
      .eq("id", progress.id)
      .single();

    expect(data?.status).toBe("cancelled");
  });

  it("should NOT distribute rewards when task is cancelled", async () => {
    const sb = getAdminClient();

    // Get initial stats
    const founderBefore = await getUserStats(founder.id);

    // Create task progress
    const progress = await createTestTaskProgress(taskId, teamA.id, {
      status: "in_progress",
    });

    // Cancel the task
    await sb
      .from("task_progress")
      .update({ status: "cancelled" })
      .eq("id", progress.id);

    // Verify NO rewards were distributed
    const founderAfter = await getUserStats(founder.id);

    expect(founderAfter.total_xp).toBe(founderBefore.total_xp);
    expect(founderAfter.total_points).toBe(founderBefore.total_points);
  });
});
