import { describe, expect, it } from "vitest";
import { estimateCostUsd, MODEL_PRICING } from "@/lib/ai/pricing";

describe("estimateCostUsd", () => {
  it("prices cached input at the cached rate", () => {
    // 3,000 fresh input + 7,000 cached + 400 output on gpt-5.4-mini.
    const cost = estimateCostUsd("gpt-5.4-mini", {
      input: 10_000,
      cached: 7_000,
      output: 400,
    });
    expect(cost).toBe(0.00458);
  });

  it("falls back to gpt-5.4 rates for an unknown model", () => {
    const usage = { input: 1_000_000, cached: 0, output: 0 };
    expect(estimateCostUsd("gpt-99", usage)).toBe(
      estimateCostUsd("gpt-5.4", usage)
    );
    expect(estimateCostUsd("gpt-5.4", usage)).toBe(2.5);
  });

  it("treats cached tokens as a subset of input tokens", () => {
    // OpenAI reports cached_tokens inside input_tokens, never on top.
    const cost = estimateCostUsd("gpt-5.4-mini", {
      input: 1_000_000,
      cached: 1_000_000,
      output: 0,
    });
    expect(cost).toBe(MODEL_PRICING["gpt-5.4-mini"].cached);
  });

  it("keeps five decimals like the ai_task_reviews cost column", () => {
    const cost = estimateCostUsd("gpt-5.4-mini", {
      input: 1,
      cached: 0,
      output: 1,
    });
    expect(String(cost).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(5);
  });
});
