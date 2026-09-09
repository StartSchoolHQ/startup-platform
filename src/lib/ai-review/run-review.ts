import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { applyDecision } from "./apply";
import { decide } from "./decide";
import { buildEvidence } from "./evidence";
import { reviewWithModel } from "./review";
import type { ReviewResult } from "./schema";
import { getAiReviewSettings } from "./settings";
import type {
  AiReviewSettings,
  CriteriaSnapshot,
  EvidenceManifestEntry,
  NormalizedSubmission,
  RejectReason,
  ReviewOutcome,
} from "./types";

export interface RunOptions {
  dryRun?: boolean;
}
export interface RunOutput {
  outcome: ReviewOutcome;
  rejectReason: RejectReason | null;
  feedback: string;
  result: ReviewResult | null;
  manifest: EvidenceManifestEntry[];
  costUsd: number;
}

export async function runReviewOnSnapshot(
  snapshot: NormalizedSubmission,
  criteria: CriteriaSnapshot,
  settings: AiReviewSettings,
  onStage?: (
    stage: "reading_files" | "checking_links" | "reviewing"
  ) => Promise<void>
): Promise<
  RunOutput & {
    model: string;
    promptVersion: string;
    usage: { input: number; output: number };
    raw: unknown;
  }
> {
  const bundle = await buildEvidence(snapshot, settings, onStage);
  await onStage?.("reviewing");
  const model = await reviewWithModel(criteria, bundle, settings);
  const d = decide(model.result, settings.confidenceThreshold);
  return {
    ...d,
    result: model.result,
    manifest: bundle.manifest,
    costUsd: model.costUsd,
    model: model.model,
    promptVersion: model.promptVersion,
    usage: model.usage,
    raw: model.raw,
  };
}

export async function runReview(
  admin: SupabaseClient<Database>,
  reviewId: string,
  opts: RunOptions = {}
): Promise<RunOutput | null> {
  const settings = await getAiReviewSettings(admin);

  type ReviewRow = Database["public"]["Tables"]["ai_task_reviews"]["Row"];
  let row: ReviewRow | null = null;
  if (opts.dryRun) {
    const { data } = await admin
      .from("ai_task_reviews")
      .select("*")
      .eq("id", reviewId)
      .single();
    row = data;
  } else {
    const { data, error } = await admin.rpc("ai_review_claim_v1", {
      p_review_id: reviewId,
    });
    if (error) throw new Error(`claim failed: ${error.message}`);
    row = Array.isArray(data) && data.length ? (data[0] as ReviewRow) : null;
  }
  if (!row) return null;

  const setStage = async (stage: string) => {
    if (opts.dryRun) return;
    await admin.from("ai_task_reviews").update({ stage }).eq("id", reviewId);
  };

  const out = await runReviewOnSnapshot(
    row.submission_snapshot as unknown as NormalizedSubmission,
    row.criteria_snapshot as unknown as CriteriaSnapshot,
    settings,
    setStage
  );

  if (!opts.dryRun) {
    await admin
      .from("ai_task_reviews")
      .update({ evidence_manifest: out.manifest as never })
      .eq("id", reviewId);
    await applyDecision(admin, reviewId, out.outcome, {
      decision: out.result?.decision,
      confidence: out.result?.confidence,
      criteria_results: out.result?.criteria,
      feedback: out.feedback,
      reject_reason: out.rejectReason,
      raw_response: out.raw,
      model: out.model,
      prompt_version: out.promptVersion,
      input_tokens: out.usage.input,
      output_tokens: out.usage.output,
      cost_usd: out.costUsd,
      decided_by: "ai",
    });
  }
  return out;
}
