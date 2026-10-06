import { describe, expect, it } from "vitest";
import {
  buildAiGenerationProperties,
  type AiGeneration,
} from "@/lib/ai/telemetry";

const base: AiGeneration = {
  distinctId: "user-1",
  traceId: "trace-1",
  sessionId: "thread-1",
  spanName: "startie.reply",
  feature: "startie",
  model: "gpt-5.4-mini",
  input: [
    { role: "system", content: "You are Startie." },
    { role: "user", content: "Hi" },
  ],
  output: "Hello!",
  usage: { input: 100, cached: 70, cacheWrite: 0, output: 5, reasoning: 2 },
  latencySeconds: 1.25,
  timeToFirstTokenSeconds: 0.3,
  stream: true,
  properties: { prompt_version: "2026-09-24.1" },
};

describe("buildAiGenerationProperties", () => {
  it("maps a successful streamed generation onto PostHog's $ai_* contract", () => {
    const p = buildAiGenerationProperties(base);
    expect(p).toMatchObject({
      $ai_trace_id: "trace-1",
      $ai_session_id: "thread-1",
      $ai_span_name: "startie.reply",
      $ai_provider: "openai",
      $ai_model: "gpt-5.4-mini",
      $ai_input: base.input,
      $ai_output_choices: [{ role: "assistant", content: "Hello!" }],
      $ai_input_tokens: 100,
      $ai_cache_read_input_tokens: 70,
      $ai_cache_creation_input_tokens: 0,
      $ai_cache_reporting_exclusive: false,
      $ai_output_tokens: 5,
      $ai_reasoning_tokens: 2,
      $ai_latency: 1.25,
      $ai_time_to_first_token: 0.3,
      $ai_stream: true,
      $ai_is_error: false,
      feature: "startie",
      prompt_version: "2026-09-24.1",
    });
    expect(p).not.toHaveProperty("$ai_error");
  });

  it("marks one-shot work with an explicit null session and no stream fields", () => {
    const p = buildAiGenerationProperties({
      ...base,
      sessionId: null,
      stream: false,
      timeToFirstTokenSeconds: undefined,
    });
    expect(p.$ai_session_id).toBeNull();
    expect(p.$ai_stream).toBe(false);
    expect(p).not.toHaveProperty("$ai_time_to_first_token");
  });

  it("records a failed call with the error message and whatever streamed", () => {
    const p = buildAiGenerationProperties({
      ...base,
      output: "partial",
      error: new Error("stream died"),
    });
    expect(p.$ai_is_error).toBe(true);
    expect(p.$ai_error).toBe("stream died");
    expect(p.$ai_output_choices).toEqual([
      { role: "assistant", content: "partial" },
    ]);
  });

  it("omits output choices when nothing came back", () => {
    const p = buildAiGenerationProperties({ ...base, output: null });
    expect(p).not.toHaveProperty("$ai_output_choices");
  });

  it("truncates oversized message content so the event stays under PostHog's size cap", () => {
    const huge = "x".repeat(100_000);
    const p = buildAiGenerationProperties({
      ...base,
      input: [{ role: "user", content: huge }],
      output: huge,
    });
    const input = p.$ai_input as { content: string }[];
    const output = p.$ai_output_choices as { content: string }[];
    expect(input[0].content.length).toBeLessThan(huge.length);
    expect(input[0].content.endsWith("…[truncated]")).toBe(true);
    expect(output[0].content.length).toBeLessThan(huge.length);
  });
});
