import type { EvidenceBundle } from "./evidence";
import { getOpenAI } from "./openai-client";
import { buildSystemPrompt, buildUserContent, PROMPT_VERSION } from "./prompt";
import {
  parseReviewResult,
  REVIEW_RESULT_JSON_SCHEMA,
  type ReviewResult,
} from "./schema";
import type { AiReviewSettings, CriteriaSnapshot } from "./types";

export interface ModelReview {
  result: ReviewResult;
  raw: unknown;
  usage: { input: number; output: number };
  costUsd: number;
  model: string;
  promptVersion: string;
}

/** USD per 1M tokens; update when pricing changes (verified 2026-09-09). */
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-5.4": { input: 2.5, output: 15 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
};

export function estimateCost(
  model: string,
  input: number,
  output: number
): number {
  const p = PRICING[model] ?? PRICING["gpt-5.4"];
  return Number(((input * p.input + output * p.output) / 1_000_000).toFixed(5));
}

export async function reviewWithModel(
  criteria: CriteriaSnapshot,
  bundle: EvidenceBundle,
  settings: AiReviewSettings
): Promise<ModelReview> {
  const openai = getOpenAI();
  const request = {
    model: settings.model,
    reasoning: { effort: "medium" as const },
    input: [
      { role: "system" as const, content: buildSystemPrompt() },
      { role: "user" as const, content: buildUserContent(criteria, bundle) },
    ],
    text: {
      format: {
        type: "json_schema" as const,
        name: "task_review",
        strict: true,
        schema: REVIEW_RESULT_JSON_SCHEMA,
      },
    },
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await openai.responses.create(request);
    try {
      const result = parseReviewResult(response.output_text);
      const input = response.usage?.input_tokens ?? 0;
      const output = response.usage?.output_tokens ?? 0;
      return {
        result,
        raw: response,
        usage: { input, output },
        costUsd: estimateCost(settings.model, input, output),
        model: response.model ?? settings.model,
        promptVersion: PROMPT_VERSION,
      };
    } catch (e) {
      lastError = e; // malformed output: retry once
    }
  }
  throw new Error(
    `Model returned unparseable output twice: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}
