/**
 * OpenAI list prices in USD per 1M tokens, shared by the AI task reviewer and
 * Startie. Verified 2026-09-24 on developers.openai.com/api/docs/pricing.
 * `cached` is the discounted rate for the prefix-cached share of input.
 */
export interface TokenUsage {
  input: number;
  /** Subset of `input` that hit the prompt cache (never on top of it). */
  cached: number;
  output: number;
}

export interface ModelPricing {
  input: number;
  cached: number;
  output: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-5.4": { input: 2.5, cached: 0.25, output: 20 },
  "gpt-5.4-mini": { input: 0.75, cached: 0.075, output: 4.5 },
};

const FALLBACK_MODEL = "gpt-5.4";

export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const p = MODEL_PRICING[model] ?? MODEL_PRICING[FALLBACK_MODEL];
  const cached = Math.min(Math.max(usage.cached, 0), Math.max(usage.input, 0));
  const fresh = Math.max(usage.input, 0) - cached;
  const usd =
    (fresh * p.input +
      cached * p.cached +
      Math.max(usage.output, 0) * p.output) /
    1_000_000;
  return Number(usd.toFixed(5));
}
