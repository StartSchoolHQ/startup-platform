/**
 * Peer Review Flow Tests
 *
 * Tests that verify the peer review system works correctly,
 * including task progress creation and status transitions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getAdminClient,
  createTestUser,
  createTestTeam,
  addTestTeamMember,
  createTestTaskProgress,
  getAnyTaskId,
} from "../setup";

describe("Peer Review Flow", () => {
  let teamA: { id: string; name: string };
  let teamB: { id: string; name: string };
  let founderA: { id: string; name: string; email: string };
  let memberA: { id: string; name: string; email: string };
  let founderB: { id: string; name: string; email: string };
  let taskId: string;

  beforeEach(async () => {
    // Create users for Team A
    founderA = await createTestUser({ name: "Founder A" });
    memberA = await createTestUser({ name: "Member A" });

    // Create users for Team B (external)
    founderB = await createTestUser({ name: "Founder B" });

    // Create Team A
    teamA = await createTestTeam(founderA.id);
    await addTestTeamMember(teamA.id, memberA.id, "member");

    // Create Team B
    teamB = await createTestTeam(founderB.id);

    // Get a real task ID
    taskId = await getAnyTaskId();
  });

  it("should create task progress in pending_review status", async () => {
    const sb = getAdminClient();

    // Create task in pending_review
    const progress = await createTestTaskProgress(taskId, teamA.id, {
      status: "pending_review",
    });

    // Verify
    const { data } = await sb
      .from("task_progress")
      .select("status, team_id")
      .eq("id", progress.id)
      .single();

    expect(data?.status).toBe("pending_review");
    expect(data?.team_id).toBe(teamA.id);
  });

  it("should allow setting rejected status", async () => {
    const sb = getAdminClient();

    // Create task in pending_review
    const progress = await createTestTaskProgress(taskId, teamA.id, {
      status: "pending_review",
    });

    // Reject (simulating peer review rejection)
    const { error } = await sb
      .from("task_progress")
      .update({ status: "rejected", review_feedback: "Needs more work" })
      .eq("id", progress.id);

    expect(error).toBeNull();

    // Verify status changed
    const { data } = await sb
      .from("task_progress")
      .select("status, review_feedback")
      .eq("id", progress.id)
      .single();

    expect(data?.status).toBe("rejected");
    expect(data?.review_feedback).toBe("Needs more work");
  });

  it("should track multiple task progress records for same team", async () => {
    const sb = getAdminClient();

    // Create multiple task progress records
    const progress1 = await createTestTaskProgress(taskId, teamA.id, {
      status: "not_started",
    });

    // Get a second task (if exists)
    const { data: tasks } = await sb
      .from("tasks")
      .select("id")
      .eq("is_active", true)
      .eq("activity_type", "team")
      .limit(2);

    if (tasks && tasks.length > 1) {
      const progress2 = await createTestTaskProgress(tasks[1].id, teamA.id, {
        status: "in_progress",
      });

      // Verify both exist
      const { data: allProgress } = await sb
        .from("task_progress")
        .select("id, status")
        .eq("team_id", teamA.id)
        .in("id", [progress1.id, progress2.id]);

      expect(allProgress?.length).toBe(2);
    }
  });

  it("should preserve task data when updating status", async () => {
    const sb = getAdminClient();

    // Create task with initial data
    const progress = await createTestTaskProgress(taskId, teamA.id, {
      status: "not_started",
    });

    // Update status
    await sb
      .from("task_progress")
      .update({ status: "in_progress" })
      .eq("id", progress.id);

    // Update again
    await sb
      .from("task_progress")
      .update({ status: "pending_review" })
      .eq("id", progress.id);

    // Verify data is preserved
    const { data } = await sb
      .from("task_progress")
      .select("task_id, team_id, status")
      .eq("id", progress.id)
      .single();

    expect(data?.task_id).toBe(taskId);
    expect(data?.team_id).toBe(teamA.id);
    expect(data?.status).toBe("pending_review");
  });

  it("should allow different teams to have same task", async () => {
    // Create task progress for Team A
    const progressA = await createTestTaskProgress(taskId, teamA.id, {
      status: "not_started",
    });

    // Create task progress for Team B with same task
    const progressB = await createTestTaskProgress(taskId, teamB.id, {
      status: "in_progress",
    });

    const sb = getAdminClient();

    // Verify both exist independently
    const { data: dataA } = await sb
      .from("task_progress")
      .select("team_id, status")
      .eq("id", progressA.id)
      .single();

    const { data: dataB } = await sb
      .from("task_progress")
      .select("team_id, status")
      .eq("id", progressB.id)
      .single();

    expect(dataA?.team_id).toBe(teamA.id);
    expect(dataA?.status).toBe("not_started");
    expect(dataB?.team_id).toBe(teamB.id);
    expect(dataB?.status).toBe("in_progress");
  });
});
