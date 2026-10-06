import { PostHog } from "posthog-node";

/**
 * PostHog AI observability, captured by hand.
 *
 * `@posthog/ai` (the OpenAI wrapper) pins `openai@^6`, and this app is on 7,
 * so every LLM call site builds one `$ai_generation` event itself through
 * `captureAiGeneration` and the route awaits `flushAiTelemetry()` before the
 * serverless function ends. Property names follow
 * https://posthog.com/docs/ai-observability/generations#event-properties.
 *
 * Off when `NEXT_PUBLIC_POSTHOG_KEY` is unset or under Vitest, so tests and
 * local runs without PostHog never emit anything.
 */

export type AiFeature = "startie" | "ai_review";

export interface AiMessage {
  role: string;
  content: string;
}

/** Per-call identity the caller knows and the model layer does not. */
export interface AiTelemetryContext {
  /** PostHog person — the student's `users.id`, same as the browser identify. */
  distinctId: string;
  /** One LLM interaction; the trace page groups events on it. */
  traceId: string;
  /** Conversation id for multi-turn products; `null` says "one-shot" on purpose. */
  sessionId: string | null;
  properties?: Record<string, string | number | boolean | null>;
}

export interface AiGeneration extends AiTelemetryContext {
  spanName: string;
  feature: AiFeature;
  model: string;
  input: AiMessage[];
  /** Full reply, the partial reply on a failed stream, or null if none came back. */
  output: string | null;
  usage: {
    /** As OpenAI reports it: inclusive of cached tokens. */
    input: number;
    cached: number;
    cacheWrite?: number;
    output: number;
    reasoning?: number;
  };
  latencySeconds: number;
  timeToFirstTokenSeconds?: number;
  stream: boolean;
  error?: unknown;
}

/** PostHog drops events over 1 MB; the reviewer's evidence bundle can be big. */
const MAX_CONTENT_CHARS = 40_000;
const TRUNCATED = "…[truncated]";

function clip(content: string): string {
  if (content.length <= MAX_CONTENT_CHARS) return content;
  return content.slice(0, MAX_CONTENT_CHARS - TRUNCATED.length) + TRUNCATED;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : JSON.stringify(error);
}

export function buildAiGenerationProperties(
  g: AiGeneration
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    $ai_trace_id: g.traceId,
    $ai_session_id: g.sessionId,
    $ai_span_name: g.spanName,
    $ai_provider: "openai",
    $ai_model: g.model,
    $ai_input: g.input.map((m) => ({ role: m.role, content: clip(m.content) })),
    $ai_input_tokens: g.usage.input,
    $ai_cache_read_input_tokens: g.usage.cached,
    $ai_cache_creation_input_tokens: g.usage.cacheWrite ?? 0,
    // OpenAI's input_tokens already include the cached subset.
    $ai_cache_reporting_exclusive: false,
    $ai_output_tokens: g.usage.output,
    $ai_reasoning_tokens: g.usage.reasoning ?? 0,
    $ai_latency: g.latencySeconds,
    $ai_stream: g.stream,
    $ai_is_error: g.error !== undefined,
    feature: g.feature,
    ...g.properties,
  };
  if (g.output !== null) {
    props.$ai_output_choices = [{ role: "assistant", content: clip(g.output) }];
  }
  if (g.timeToFirstTokenSeconds !== undefined) {
    props.$ai_time_to_first_token = g.timeToFirstTokenSeconds;
  }
  if (g.error !== undefined) {
    props.$ai_error = errorMessage(g.error);
  }
  return props;
}

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client !== undefined) return client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || process.env.NODE_ENV === "test") {
    client = null;
    return client;
  }
  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // Serverless: send each event at once; the route awaits flushAiTelemetry().
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

/** Fire-and-forget; never throws, so a PostHog hiccup cannot fail a reply. */
export function captureAiGeneration(g: AiGeneration): void {
  try {
    getClient()?.capture({
      distinctId: g.distinctId,
      event: "$ai_generation",
      properties: buildAiGenerationProperties(g),
    });
  } catch (e) {
    console.error("[ai-telemetry] capture failed", e);
  }
}

/** Await before the function returns, or Vercel may kill the in-flight send. */
export async function flushAiTelemetry(): Promise<void> {
  try {
    await getClient()?.flush();
  } catch (e) {
    console.error("[ai-telemetry] flush failed", e);
  }
}
