import Anthropic from "@anthropic-ai/sdk";

/**
 * Shared Anthropic client. First consumer: the program assistant's
 * explanations. Startie and the AI reviewer stay on OpenAI.
 *
 * Credentials come from `ANTHROPIC_API_KEY` (Vercel). One retry, 60 s
 * timeout: every call here is a short structured answer, never a stream.
 */

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  client ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 1,
    timeout: 60_000,
  });
  return client;
}

/** Test seam: inject a fake client. */
export function setAnthropicForTests(fake: Anthropic | null): void {
  client = fake;
}
