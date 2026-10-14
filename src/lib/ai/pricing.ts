/**
 * Model list prices in USD per 1M tokens, shared by the AI task reviewer,
 * Startie (OpenAI) and the program assistant (Anthropic). Verified 2026-09-24 on developers.openai.com/api/docs/pricing.
 * `cached` is the discounted rate for the prefix-cached share of input.
 */
export interface TokenUsage {
  input: number;
  /** Subset of `input` that hit the prompt cache (never on top of it). */
  cached: number;
  /** Tokens OpenAI wrote to the cache on this call (diagnostic; not billed extra). */
  cacheWrite?: number;
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
  // Anthropic list prices (program assistant), per the claude-api reference
  // of 2026-10-06: Sonnet 5.5 $2 / $10, cache read $0.20; Opus 5.5 $4 / $20,
  // cache read $0.20. Cache writes (1.25x input) are not modelled.
  "claude-sonnet-5-5": { input: 2, cached: 0.2, output: 10 },
  "claude-opus-5-5": { input: 4, cached: 0.2, output: 20 },
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
