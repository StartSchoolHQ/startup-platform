import { describe, expect, it } from "vitest";
import { decide } from "@/lib/ai-review/decide";
import type { ReviewResult } from "@/lib/ai-review/schema";

const base: ReviewResult = {
  decision: true,
  confidence: 0.9,
  criteria: [
    { id: "c1", label: "Has screenshot", passed: true, evidence: "img 1" },
    { id: "c2", label: "Date visible", passed: false, evidence: "no date" },
  ],
  reject_rules_triggered: [],
  unverifiable_evidence: false,
  feedback: "Good.",
};

describe("decide", () => {
  it("approves a confident true", () => {
    expect(decide(base, 0.75)).toEqual({
      outcome: "approved",
      rejectReason: null,
      feedback: "Good.",
    });
  });
  it("rejects a low-confidence true and rewrites feedback to name the weakest criteria", () => {
    const d = decide({ ...base, confidence: 0.5 }, 0.75);
    expect(d.outcome).toBe("rejected");
    expect(d.rejectReason).toBe("low_confidence");
    expect(d.feedback).toContain("Date visible");
  });
  it("rejects a false regardless of confidence", () => {
    expect(
      decide({ ...base, decision: false, confidence: 0.2 }, 0.75).outcome
    ).toBe("rejected");
    expect(decide({ ...base, decision: false }, 0.75).rejectReason).toBe(
      "criteria"
    );
  });
  it("labels unverifiable evidence", () => {
    expect(
      decide({ ...base, decision: false, unverifiable_evidence: true }, 0.75)
        .rejectReason
    ).toBe("unverifiable_evidence");
  });
});
