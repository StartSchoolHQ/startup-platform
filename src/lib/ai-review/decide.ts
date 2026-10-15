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
    // A low-confidence pass almost always has every criterion marked passed
    // (that is why the model said true), so "the failed ones" is usually an
    // empty list. Fall back to naming all of them: the student still needs
    // to know which checks to strengthen, not a placeholder sentence.
    const weak = result.criteria.filter((c) => !c.passed).map((c) => c.label);
    const names = (weak.length ? weak : result.criteria.map((c) => c.label))
      .filter((label) => label.trim().length > 0)
      .join(", ");
    const target = names || "each requirement of the task";
    return {
      outcome: "rejected",
      rejectReason: "low_confidence",
      // The model's own feedback is written for a PASS here (it decided true)
      // and would contradict the rejection, so it is deliberately dropped.
      feedback: `The reviewer leaned towards a pass but could not verify your work with enough certainty. Add clearer, concrete evidence (names, dates, numbers, screenshots or links) for: ${target}.`,
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
