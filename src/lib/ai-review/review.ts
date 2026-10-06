import type OpenAI from "openai";
import type { EvidenceBundle } from "./evidence";
import { estimateCostUsd } from "@/lib/ai/pricing";
import {
  captureAiGeneration,
  type AiMessage,
  type AiTelemetryContext,
} from "@/lib/ai/telemetry";
import { getOpenAI } from "./openai-client";
import {
  buildSystemPrompt,
  buildUserContent,
  newPromptNonce,
  PROMPT_VERSION,
} from "./prompt";
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

/** Kept for callers/tests; delegates to the shared pricing table. */
export function estimateCost(
  model: string,
  input: number,
  output: number,
  cached = 0
): number {
  return estimateCostUsd(model, { input, cached, output });
}

/** A second model call needs this much of the worker budget left to be safe. */
const RETRY_COST_MS = 95_000;

const REASONING_EFFORT = "medium" as const;

/**
 * Flattens the multipart user message for PostHog: text stays, images and
 * PDFs become labels. Their base64 payloads would blow the event size cap
 * and the evidence manifest already records what was sent.
 */
function toAiMessages(
  messages: {
    role: string;
    content: string | OpenAI.Responses.ResponseInputContent[];
  }[]
): AiMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content:
      typeof m.content === "string"
        ? m.content
        : m.content
            .map((part) => {
              if (part.type === "input_text") return part.text;
              if (part.type === "input_file") {
                return `[file: ${part.filename ?? "file"}]`;
              }
              return "[image]";
            })
            .join("\n"),
  }));
}

/**
 * One review = one model call, or two when the first reply is unparseable.
 * With `telemetry` set, every call becomes its own `$ai_generation` event on
 * the review's trace — including SDK failures, so timeouts show up in
 * PostHog with their latency instead of vanishing.
 */
export async function reviewWithModel(
  criteria: CriteriaSnapshot,
  bundle: EvidenceBundle,
  settings: AiReviewSettings,
  deadlineAt?: number,
  telemetry?: AiTelemetryContext
): Promise<ModelReview> {
  const openai = getOpenAI();
  const nonce = newPromptNonce();
  const messages = [
    { role: "system" as const, content: buildSystemPrompt(nonce) },
    {
      role: "user" as const,
      content: buildUserContent(criteria, bundle, nonce),
    },
  ];
  const request = {
    model: settings.model,
    reasoning: { effort: REASONING_EFFORT },
    input: messages,
    text: {
      format: {
        type: "json_schema" as const,
        name: "task_review",
        strict: true,
        schema: REVIEW_RESULT_JSON_SCHEMA,
      },
    },
  };

  const startedAt = Date.now();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const outOfTime =
      deadlineAt !== undefined
        ? Date.now() + RETRY_COST_MS > deadlineAt
        : Date.now() - startedAt >= 150_000;
    if (attempt > 0 && outOfTime) {
      // Not enough time left in the worker's maxDuration budget for a second
      // model call (client timeout 90s x up to 2 tries each): fail fast.
      throw new Error(
        `Model returned unparseable output (retry budget exhausted): ${lastError instanceof Error ? lastError.message : String(lastError)}`
      );
    }
    const callStartedAt = Date.now();
    let response: Awaited<ReturnType<typeof openai.responses.create>>;
    try {
      response = await openai.responses.create(request);
    } catch (e) {
      if (telemetry) {
        captureAiGeneration({
          ...telemetry,
          spanName: "ai_review.grade",
          feature: "ai_review",
          model: settings.model,
          input: toAiMessages(messages),
          output: null,
          usage: { input: 0, cached: 0, output: 0 },
          latencySeconds: (Date.now() - callStartedAt) / 1000,
          stream: false,
          error: e,
          properties: {
            ...telemetry.properties,
            reasoning_effort: REASONING_EFFORT,
            model_call: attempt + 1,
          },
        });
      }
      throw e;
    }
    const input = response.usage?.input_tokens ?? 0;
    const output = response.usage?.output_tokens ?? 0;
    const cached = response.usage?.input_tokens_details?.cached_tokens ?? 0;
    if (telemetry) {
      captureAiGeneration({
        ...telemetry,
        spanName: "ai_review.grade",
        feature: "ai_review",
        model: response.model ?? settings.model,
        input: toAiMessages(messages),
        output: response.output_text || null,
        usage: {
          input,
          cached,
          output,
          reasoning:
            response.usage?.output_tokens_details?.reasoning_tokens ?? 0,
        },
        latencySeconds: (Date.now() - callStartedAt) / 1000,
        stream: false,
        properties: {
          ...telemetry.properties,
          reasoning_effort: REASONING_EFFORT,
          model_call: attempt + 1,
        },
      });
    }
    try {
      const result = parseReviewResult(response.output_text);
      return {
        result,
        raw: response,
        usage: { input, output },
        costUsd: estimateCost(settings.model, input, output, cached),
        model: response.model ?? settings.model,
        promptVersion: PROMPT_VERSION,
      };
    } catch (e) {
      lastError = e; // malformed output: retry once
      console.error("[ai-review] unparseable model output", {
        attempt,
        message: e instanceof Error ? e.message : String(e),
        sample: response.output_text.slice(0, 500),
      });
    }
  }
  throw new Error(
    `Model returned unparseable output twice: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}
