import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureAiGeneration } from "@/lib/ai/telemetry";
import { getOpenAI } from "@/lib/ai-review/openai-client";
import { reviewWithModel } from "@/lib/ai-review/review";
import type { EvidenceBundle } from "@/lib/ai-review/evidence";
import type { AiReviewSettings, CriteriaSnapshot } from "@/lib/ai-review/types";

vi.mock("@/lib/ai/telemetry", () => ({ captureAiGeneration: vi.fn() }));
vi.mock("@/lib/ai-review/openai-client", () => ({ getOpenAI: vi.fn() }));
vi.mock("@/lib/ai-review/prompt", () => ({
  PROMPT_VERSION: "test",
  newPromptNonce: () => "nonce",
  buildSystemPrompt: () => "SYSTEM",
  buildUserContent: () => [
    { type: "input_text", text: "Submission: interviewed five people" },
    { type: "input_image", image_url: "data:image/png;base64,AAAA" },
    {
      type: "input_file",
      filename: "notes.pdf",
      file_data: "data:application/pdf;base64,BBBB",
    },
  ],
}));

const create = vi.fn();
const criteria = {} as CriteriaSnapshot;
const bundle = {} as EvidenceBundle;
const settings = { model: "gpt-5.4" } as AiReviewSettings;
const telemetry = {
  distinctId: "student-1",
  traceId: "review-1",
  sessionId: null,
  properties: { prompt_version: "v1", attempt: 2 },
};

const goodReply = JSON.stringify({
  decision: true,
  confidence: 0.9,
  criteria: [
    { id: "c1", label: "Interviews", passed: true, evidence: "five named" },
  ],
  reject_rules_triggered: [],
  unverifiable_evidence: false,
  feedback: "Nice work.",
});

function response(text: string) {
  return {
    model: "gpt-5.4-2026-07-01",
    output_text: text,
    usage: {
      input_tokens: 2000,
      output_tokens: 150,
      input_tokens_details: { cached_tokens: 1500 },
      output_tokens_details: { reasoning_tokens: 40 },
    },
  };
}

beforeEach(() => {
  vi.mocked(captureAiGeneration).mockReset();
  create.mockReset();
  vi.mocked(getOpenAI).mockReturnValue({
    responses: { create },
  } as never);
});

describe("reviewWithModel telemetry", () => {
  it("captures one generation per model call on the review's trace", async () => {
    create.mockResolvedValueOnce(response(goodReply));
    await reviewWithModel(criteria, bundle, settings, undefined, telemetry);
    expect(captureAiGeneration).toHaveBeenCalledTimes(1);
    const g = vi.mocked(captureAiGeneration).mock.calls[0][0];
    expect(g).toMatchObject({
      distinctId: "student-1",
      traceId: "review-1",
      sessionId: null,
      spanName: "ai_review.grade",
      feature: "ai_review",
      model: "gpt-5.4-2026-07-01",
      output: goodReply,
      usage: { input: 2000, cached: 1500, output: 150, reasoning: 40 },
      stream: false,
      properties: {
        prompt_version: "v1",
        attempt: 2,
        reasoning_effort: "medium",
        model_call: 1,
      },
    });
    expect(g.error).toBeUndefined();
    expect(g.latencySeconds).toBeGreaterThanOrEqual(0);
  });

  it("flattens images and PDFs to labels so base64 never reaches PostHog", async () => {
    create.mockResolvedValueOnce(response(goodReply));
    await reviewWithModel(criteria, bundle, settings, undefined, telemetry);
    const g = vi.mocked(captureAiGeneration).mock.calls[0][0];
    expect(g.input).toEqual([
      { role: "system", content: "SYSTEM" },
      {
        role: "user",
        content:
          "Submission: interviewed five people\n[image]\n[file: notes.pdf]",
      },
    ]);
    expect(JSON.stringify(g.input)).not.toContain("base64");
  });

  it("captures both calls when the first reply is unparseable", async () => {
    create
      .mockResolvedValueOnce(response("not json"))
      .mockResolvedValueOnce(response(goodReply));
    await reviewWithModel(criteria, bundle, settings, undefined, telemetry);
    expect(captureAiGeneration).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(captureAiGeneration).mock.calls;
    expect(calls[0][0].properties?.model_call).toBe(1);
    expect(calls[0][0].output).toBe("not json");
    expect(calls[1][0].properties?.model_call).toBe(2);
  });

  it("captures an SDK failure as an error generation and rethrows", async () => {
    create.mockRejectedValueOnce(new Error("timeout"));
    await expect(
      reviewWithModel(criteria, bundle, settings, undefined, telemetry)
    ).rejects.toThrow("timeout");
    const g = vi.mocked(captureAiGeneration).mock.calls[0][0];
    expect(g.error).toBeInstanceOf(Error);
    expect(g.output).toBeNull();
    expect(g.model).toBe("gpt-5.4");
  });

  it("captures nothing without a telemetry context", async () => {
    create.mockResolvedValueOnce(response(goodReply));
    await reviewWithModel(criteria, bundle, settings);
    expect(captureAiGeneration).not.toHaveBeenCalled();
  });
});
