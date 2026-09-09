import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ReviewOutcome } from "./types";

export async function applyDecision(
  admin: SupabaseClient<Database>,
  reviewId: string,
  outcome: ReviewOutcome,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await admin.rpc("ai_review_apply_decision_v1", {
    p_review_id: reviewId,
    p_outcome: outcome,
    p_payload: payload as never,
  });
  if (error)
    throw new Error(`ai_review_apply_decision_v1 failed: ${error.message}`);
}
