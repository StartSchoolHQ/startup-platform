/**
 * DB round-trip tests for the AI task reviewer RPCs.
 * Creates ONE auth user, ONE test task template and ONE task_progress row per
 * test, and deletes all of them (ai_task_reviews cascades from task_progress).
 * Runs against the production project via service role — cleanup is asserted.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EMAIL = `test_ai_review_${Date.now()}@test.local`;
const PASSWORD = `Test-${crypto.randomUUID()}`;

let admin: SupabaseClient;
let student: SupabaseClient;
let userId: string;
let taskId: string;
let originalAiReviewSettings: Record<string, unknown> | null = null;
const progressIds: string[] = [];

/**
 * Flips only `mode` on the live `ai_review` settings row, keeping every other
 * field exactly as production has it. Every caller restores it in a `finally`,
 * and afterAll writes the original row back verbatim as a safety net.
 */
async function setAiReviewMode(mode: "ai" | "auto_approve"): Promise<void> {
  const { error } = await admin
    .from("platform_settings")
    .update({ value: { ...(originalAiReviewSettings ?? {}), mode } })
    .eq("key", "ai_review");
  if (error) throw error;
}

/**
 * A balance update made through the STUDENT session (auto_approve path) writes
 * `audit_log` rows whose `changed_by_user_id` FK is ON DELETE NO ACTION, which
 * blocks deleting the auth user. Rows are kept and the reference is nulled -
 * the same treatment the 2026-07-28 dropout deletion used.
 */
async function releaseAuditRefs(id: string): Promise<void> {
  const { error } = await admin
    .from("audit_log")
    .update({ changed_by_user_id: null })
    .eq("changed_by_user_id", id);
  if (error) throw error;
}

/** Safety net for an auth user a previous run's teardown failed to remove. */
async function purgeOrphanTestAuthUsers(): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const orphans = data.users.filter((u) =>
    u.email?.startsWith("test_ai_review_")
  );
  for (const orphan of orphans) {
    await releaseAuditRefs(orphan.id);
    await admin.from("users").delete().eq("id", orphan.id);
    const { error: delErr } = await admin.auth.admin.deleteUser(orphan.id);
    if (delErr) throw delErr;
  }
}

beforeAll(async () => {
  admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await purgeOrphanTestAuthUsers();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  userId = created.user.id;
  await admin.from("users").upsert({
    id: userId,
    name: "test_ai_review_student",
    email: EMAIL,
    primary_role: "user",
    status: "active",
  });
  const { data: settingsRow, error: settingsErr } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "ai_review")
    .single();
  if (settingsErr) throw settingsErr;
  originalAiReviewSettings = settingsRow.value as Record<string, unknown>;

  const { data: task, error: taskErr } = await admin
    .from("tasks")
    .insert({
      template_code: `TEST-AI-${Date.now()}`,
      title: "test_ai_review task",
      activity_type: "individual",
      base_xp_reward: 120,
      base_points_reward: 30,
      requires_review: true,
      peer_review_criteria: [
        { category: "What to evaluate:**", points: ["1. Has a screenshot"] },
        { category: "Reject if:**", points: ["- No screenshot"] },
      ],
    })
    .select("id")
    .single();
  if (taskErr) throw taskErr;
  taskId = task.id;

  student = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInErr } = await student.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signInErr) throw signInErr;
}, 30000);

async function createProgress(status = "in_progress"): Promise<string> {
  const { data, error } = await admin
    .from("task_progress")
    .insert({
      task_id: taskId,
      user_id: userId,
      context: "individual",
      activity_type: "individual",
      status,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  progressIds.push(data.id);
  return data.id;
}

afterEach(async () => {
  if (progressIds.length === 0) return;
  const { error: txErr } = await admin
    .from("transactions")
    .delete()
    .eq("user_id", userId);
  if (txErr) throw txErr;
  const { error: notifErr } = await admin
    .from("notifications")
    .delete()
    .eq("user_id", userId);
  if (notifErr) throw notifErr;
  const { error } = await admin
    .from("task_progress")
    .delete()
    .in("id", progressIds);
  if (error) throw error;

  const { count: txCount } = await admin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  expect(txCount).toBe(0);
  const { count: notifCount } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  expect(notifCount).toBe(0);
  const { count } = await admin
    .from("ai_task_reviews")
    .select("id", { count: "exact", head: true })
    .in("progress_id", progressIds);
  expect(count).toBe(0);
  progressIds.length = 0;
});

afterAll(async () => {
  if (originalAiReviewSettings) {
    const { error: settingsErr } = await admin
      .from("platform_settings")
      .update({ value: originalAiReviewSettings })
      .eq("key", "ai_review");
    if (settingsErr) throw settingsErr;
  }
  const { error: taskErr } = await admin
    .from("tasks")
    .delete()
    .eq("id", taskId);
  if (taskErr) throw taskErr;
  const { error: userErr } = await admin
    .from("users")
    .delete()
    .eq("id", userId);
  if (userErr) throw userErr;
  await releaseAuditRefs(userId);
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) throw authErr;
}, 30000);

describe("submit_individual_task_v1", () => {
  it("queues a review, freezes a snapshot and sets pending_review", async () => {
    const progressId = await createProgress();
    const { data, error } = await student.rpc("submit_individual_task_v1", {
      p_progress_id: progressId,
      p_submission_data: {
        description: "done",
        external_urls: [{ url: "", type: "link", title: "https://x.test" }],
        files: ["https://s.test/a.png"],
      },
    });
    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.attempt).toBe(1);
    expect(data.mode).toBe("ai");

    const { data: review } = await admin
      .from("ai_task_reviews")
      .select("status, submission_snapshot, criteria_snapshot")
      .eq("id", data.review_id)
      .single();
    expect(review!.status).toBe("queued");
    expect(review!.submission_snapshot.links).toEqual([
      { url: "https://x.test", title: "https://x.test" },
    ]);
    expect(review!.submission_snapshot.files[0].url).toBe(
      "https://s.test/a.png"
    );
    expect(review!.criteria_snapshot.criteria).toHaveLength(2);

    const { data: tp } = await admin
      .from("task_progress")
      .select("status")
      .eq("id", progressId)
      .single();
    expect(tp!.status).toBe("pending_review");
  });

  it("denies another user's progress row and wrong statuses", async () => {
    const pending = await createProgress("pending_review");
    const { error } = await student.rpc("submit_individual_task_v1", {
      p_progress_id: pending,
      p_submission_data: { description: "x" },
    });
    expect(error?.message).toContain("ai_review_submit_denied");

    // task_progress has a unique (task_id, user_id) index for non-recurring
    // tasks (task_progress_unique_user_task_non_recurring) — free it up
    // before creating a second row for the same task/user.
    await admin.from("task_progress").delete().eq("id", pending);

    const { error: svcErr } = await admin.rpc("submit_individual_task_v1", {
      p_progress_id: await createProgress(),
      p_submission_data: { description: "x" },
    });
    // service role has no auth.uid() → denied as "not your task"
    expect(svcErr?.message).toContain("ai_review_submit_denied");
  });

  it("increments attempt on resubmit after a rejection", async () => {
    const progressId = await createProgress();
    const first = await student.rpc("submit_individual_task_v1", {
      p_progress_id: progressId,
      p_submission_data: { description: "v1" },
    });
    await admin.rpc("ai_review_claim_v1", {
      p_review_id: first.data.review_id,
    });
    await admin.rpc("ai_review_apply_decision_v1", {
      p_review_id: first.data.review_id,
      p_outcome: "rejected",
      p_payload: { feedback: "add a screenshot", reject_reason: "criteria" },
    });
    const second = await student.rpc("submit_individual_task_v1", {
      p_progress_id: progressId,
      p_submission_data: { description: "v2" },
    });
    expect(second.data.attempt).toBe(2);
    const { data: tp } = await admin
      .from("task_progress")
      .select("submission_history")
      .eq("id", progressId)
      .single();
    expect(tp!.submission_history).toHaveLength(1);
  });

  it("mode auto_approve approves and pays instantly, with no AI call", async () => {
    const progressId = await createProgress();
    try {
      await setAiReviewMode("auto_approve");
      const { data, error } = await student.rpc("submit_individual_task_v1", {
        p_progress_id: progressId,
        p_submission_data: { description: "instant" },
      });
      expect(error).toBeNull();
      expect(data.mode).toBe("auto_approve");

      const { data: tp } = await admin
        .from("task_progress")
        .select("status")
        .eq("id", progressId)
        .single();
      expect(tp!.status).toBe("approved");

      const { data: tx } = await admin
        .from("transactions")
        .select("activity_type, metadata")
        .eq("user_id", userId);
      expect(tx).toHaveLength(1);
      expect(tx![0].activity_type).toBe("individual");
      expect(tx![0].metadata.decided_by).toBe("auto_approve_fallback");

      const { data: review } = await admin
        .from("ai_task_reviews")
        .select("status, decided_by, feedback")
        .eq("id", data.review_id)
        .single();
      expect(review).toMatchObject({
        status: "approved",
        decided_by: "auto_approve_fallback",
      });
      expect(review!.feedback).toBeTruthy();
    } finally {
      await setAiReviewMode("ai");
    }
  });
});

describe("ai_review_apply_decision_v1", () => {
  async function queued(): Promise<{ progressId: string; reviewId: string }> {
    const progressId = await createProgress();
    const { data } = await student.rpc("submit_individual_task_v1", {
      p_progress_id: progressId,
      p_submission_data: { description: "x" },
    });
    await admin.rpc("ai_review_claim_v1", { p_review_id: data.review_id });
    return { progressId, reviewId: data.review_id };
  }

  it("approve pays exactly once into the My Journey economy", async () => {
    const { progressId, reviewId } = await queued();
    const before = await admin
      .from("users")
      .select("total_xp, my_journey_xp, my_journey_credits")
      .eq("id", userId)
      .single();
    const { data, error } = await admin.rpc("ai_review_apply_decision_v1", {
      p_review_id: reviewId,
      p_outcome: "approved",
      p_payload: { feedback: "Nice work.", confidence: 0.9, decision: true },
    });
    expect(error).toBeNull();
    expect(data.xp_awarded).toBe(120);
    const after = await admin
      .from("users")
      .select("total_xp, my_journey_xp, my_journey_credits")
      .eq("id", userId)
      .single();
    expect(after.data!.total_xp - before.data!.total_xp).toBe(120);
    expect(after.data!.my_journey_xp - before.data!.my_journey_xp).toBe(120);
    expect(
      after.data!.my_journey_credits - before.data!.my_journey_credits
    ).toBe(30);

    const { data: tp } = await admin
      .from("task_progress")
      .select("status, review_feedback, points_awarded")
      .eq("id", progressId)
      .single();
    expect(tp).toMatchObject({
      status: "approved",
      review_feedback: "Nice work.",
      points_awarded: 30,
    });
    const { data: tx } = await admin
      .from("transactions")
      .select("activity_type, metadata")
      .eq("user_id", userId);
    expect(tx).toHaveLength(1);
    expect(tx![0].activity_type).toBe("individual");
    expect(tx![0].metadata.completion_type).toBe("ai_review_approved");

    const again = await admin.rpc("ai_review_apply_decision_v1", {
      p_review_id: reviewId,
      p_outcome: "approved",
      p_payload: { feedback: "again" },
    });
    expect(again.error?.message).toContain("ai_review_already_final");
  });

  it("refuses an approval without feedback", async () => {
    const { reviewId } = await queued();
    const { error } = await admin.rpc("ai_review_apply_decision_v1", {
      p_review_id: reviewId,
      p_outcome: "approved",
      p_payload: {},
    });
    expect(error?.message).toContain("ai_review_feedback_required");
  });

  it("failed hands the task back as rejected with the technical message", async () => {
    const { progressId, reviewId } = await queued();
    await admin.rpc("ai_review_apply_decision_v1", {
      p_review_id: reviewId,
      p_outcome: "failed",
      p_payload: { error: "boom" },
    });
    const { data: tp } = await admin
      .from("task_progress")
      .select("status, review_feedback")
      .eq("id", progressId)
      .single();
    expect(tp!.status).toBe("rejected");
    expect(tp!.review_feedback).toContain("could not complete");
    const { data: r } = await admin
      .from("ai_task_reviews")
      .select("reject_reason, decided_by")
      .eq("id", reviewId)
      .single();
    expect(r).toMatchObject({
      reject_reason: "technical_failure",
      decided_by: "system",
    });
  });

  it("student status RPC is sanitised and owner-only", async () => {
    const { progressId, reviewId } = await queued();
    await admin.rpc("ai_review_apply_decision_v1", {
      p_review_id: reviewId,
      p_outcome: "rejected",
      p_payload: {
        feedback: "missing screenshot",
        raw_response: { secret: 1 },
        cost_usd: 0.03,
      },
    });
    const { data } = await student.rpc("get_ai_review_status_v1", {
      p_progress_id: progressId,
    });
    expect(data.status).toBe("rejected");
    expect(data.feedback).toBe("missing screenshot");
    expect(data.raw_response).toBeUndefined();
    expect(data.cost_usd).toBeUndefined();
    const { data: none } = await admin.rpc("get_ai_review_status_v1", {
      p_progress_id: progressId,
    });
    expect(none).toBeNull();
  });
});

describe("ai_review_requeue_stale_v1", () => {
  it("finalises a row as failed once retry_count reaches 3", async () => {
    const progressId = await createProgress();
    const { data } = await student.rpc("submit_individual_task_v1", {
      p_progress_id: progressId,
      p_submission_data: { description: "x" },
    });
    await admin
      .from("ai_task_reviews")
      .update({
        status: "running",
        retry_count: 3,
        claimed_at: new Date(Date.now() - 10 * 60000).toISOString(),
      })
      .eq("id", data.review_id);
    const { data: n } = await admin.rpc("ai_review_requeue_stale_v1");
    expect(n).toBeGreaterThanOrEqual(1);
    const { data: r } = await admin
      .from("ai_task_reviews")
      .select("status")
      .eq("id", data.review_id)
      .single();
    expect(r!.status).toBe("failed");
  });
});
