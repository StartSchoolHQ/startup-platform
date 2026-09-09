import type { ReviewResult } from "./schema";
import type { RejectReason } from "./types";

export interface Decision {
  outcome: "approved" | "rejected";
  rejectReason: RejectReason | null;
  feedback: string;
}

export function decide(result: ReviewResult, threshold: number): Decision {
  if (result.decision && result.confidence >= threshold) {
    return {
      outcome: "approved",
      rejectReason: null,
      feedback: result.feedback,
    };
  }
  if (result.decision) {
    const weak = result.criteria.filter((c) => !c.passed).map((c) => c.label);
    const names = weak.length
      ? weak.join(", ")
      : "the criteria the reviewer was least sure about";
    return {
      outcome: "rejected",
      rejectReason: "low_confidence",
      // The model's own feedback is written for a PASS here (it decided true)
      // and would contradict the rejection, so it is deliberately dropped.
      feedback: `The reviewer could not verify your work with enough certainty. Please add clearer evidence for: ${names}.`,
    };
  }
  return {
    outcome: "rejected",
    rejectReason: result.unverifiable_evidence
      ? "unverifiable_evidence"
      : "criteria",
    feedback: result.feedback,
  };
}
