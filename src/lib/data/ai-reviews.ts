import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

export interface AiReviewCriterion {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
}

export interface AiReviewStatus {
  review_id: string;
  attempt: number;
  status: "queued" | "running" | "approved" | "rejected" | "failed";
  stage: string | null;
  decision: boolean | null;
  feedback: string | null;
  criteria_results: AiReviewCriterion[] | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface SubmitIndividualTaskResult {
  success: boolean;
  review_id: string;
  attempt: number;
  mode: "ai" | "auto_approve";
}

/** Submits a My Journey task for AI review (or instant approval when the switch is off). */
export async function submitIndividualTaskV1(
  progressId: string,
  submissionData: Record<string, unknown>
): Promise<SubmitIndividualTaskResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_individual_task_v1", {
    p_progress_id: progressId,
    p_submission_data: submissionData as Json,
  });
  if (error) {
    throw new Error(
      error.message.includes("ai_review_submit_denied")
        ? "This task can't be submitted right now. Refresh the page and try again."
        : `Submission failed: ${error.message}`
    );
  }
  return data as unknown as SubmitIndividualTaskResult;
}

/** Latest AI review attempt for the caller's own progress row, or null. */
export async function getAiReviewStatus(
  progressId: string
): Promise<AiReviewStatus | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_ai_review_status_v1", {
    p_progress_id: progressId,
  });
  if (error) throw new Error(`Could not load review status: ${error.message}`);
  return (data as unknown as AiReviewStatus | null) ?? null;
}
