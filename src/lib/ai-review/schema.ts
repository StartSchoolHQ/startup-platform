import { z } from "zod";

export const ReviewResultSchema = z.object({
  decision: z.boolean(),
  confidence: z.number().min(0).max(1),
  criteria: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      passed: z.boolean(),
      evidence: z.string(),
    })
  ),
  reject_rules_triggered: z.array(z.string()),
  unverifiable_evidence: z.boolean(),
  feedback: z.string().min(1),
});
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

/** Hand-written strict JSON schema for OpenAI `text.format` (subset only). */
export const REVIEW_RESULT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "decision",
    "confidence",
    "criteria",
    "reject_rules_triggered",
    "unverifiable_evidence",
    "feedback",
  ],
  properties: {
    decision: {
      type: "boolean",
      description:
        "true only if every 'What to evaluate' item is verified from evidence and no 'Reject if' rule is met",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "0–1, how sure you are of `decision`",
    },
    criteria: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "passed", "evidence"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          passed: { type: "boolean" },
          evidence: {
            type: "string",
            description: "which evidence item shows it, or why it is unmet",
          },
        },
      },
    },
    reject_rules_triggered: { type: "array", items: { type: "string" } },
    unverifiable_evidence: {
      type: "boolean",
      description:
        "true when a criterion failed only because its evidence was unreachable, unsupported or too large",
    },
    feedback: {
      type: "string",
      minLength: 1,
      description:
        "verdict first, then what works, what is missing, one next move; second person, prose, <=150 words, required on pass and fail",
    },
  },
} as const;

export function parseReviewResult(text: string): ReviewResult {
  return ReviewResultSchema.parse(JSON.parse(text));
}
