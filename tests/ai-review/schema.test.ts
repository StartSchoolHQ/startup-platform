import { describe, expect, it } from "vitest";
import {
  parseReviewResult,
  REVIEW_RESULT_JSON_SCHEMA,
} from "@/lib/ai-review/schema";

describe("parseReviewResult", () => {
  it("accepts a valid payload", () => {
    const r = parseReviewResult(
      JSON.stringify({
        decision: true,
        confidence: 0.8,
        criteria: [{ id: "1", label: "x", passed: true, evidence: "y" }],
        reject_rules_triggered: [],
        unverifiable_evidence: false,
        feedback: "ok",
      })
    );
    expect(r.decision).toBe(true);
  });
  it("rejects missing feedback and out-of-range confidence", () => {
    expect(() =>
      parseReviewResult(
        JSON.stringify({
          decision: true,
          confidence: 1.2,
          criteria: [],
          reject_rules_triggered: [],
          unverifiable_evidence: false,
          feedback: "x",
        })
      )
    ).toThrow();
    expect(() =>
      parseReviewResult(
        JSON.stringify({
          decision: true,
          confidence: 0.5,
          criteria: [],
          reject_rules_triggered: [],
          unverifiable_evidence: false,
        })
      )
    ).toThrow();
  });
  it("json schema is strict: every property required, no additional", () => {
    const s = REVIEW_RESULT_JSON_SCHEMA as {
      required: string[];
      properties: Record<string, unknown>;
      additionalProperties: boolean;
    };
    expect(s.additionalProperties).toBe(false);
    expect(s.required.sort()).toEqual(Object.keys(s.properties).sort());
  });
});
