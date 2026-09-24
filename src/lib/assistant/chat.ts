import type OpenAI from "openai";
import type { TokenUsage } from "@/lib/ai/pricing";
import type { ReasoningEffort } from "./types";

export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StreamResult {
  text: string;
  usage: TokenUsage;
  model: string;
}

export interface StreamArgs {
  openai: OpenAI;
  model: string;
  effort: ReasoningEffort;
  /** Static, cacheable system prompt — identical for every student. */
  system: string;
  /** Nonce-delimited student + page data. */
  context: string;
  /** Oldest first; the student's newest message is the last item. */
  history: HistoryTurn[];
  promptCacheKey: string;
}

/**
 * Streams one Startie reply through the Responses API. Yields text deltas as
 * they arrive and returns the full text plus token usage when the stream
 * completes. A mid-stream failure — thrown by the SDK or reported as a
 * `response.failed` / `response.incomplete` / `error` event — is rethrown so
 * the caller can record what already streamed.
 */
export async function* streamStartieReply(
  args: StreamArgs
): AsyncGenerator<string, StreamResult> {
  const stream = await args.openai.responses.create({
    model: args.model,
    stream: true,
    reasoning: { effort: args.effort },
    prompt_cache_key: args.promptCacheKey,
    input: [
      { role: "system", content: args.system },
      { role: "developer", content: args.context },
      ...args.history.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
    ],
  });

  let text = "";
  let usage: TokenUsage = { input: 0, cached: 0, cacheWrite: 0, output: 0 };
  let model = args.model;

  for await (const event of stream as AsyncIterable<OpenAI.Responses.ResponseStreamEvent>) {
    if (event.type === "response.output_text.delta") {
      text += event.delta;
      yield event.delta;
    } else if (event.type === "response.completed") {
      const u = event.response.usage;
      usage = {
        input: u?.input_tokens ?? 0,
        cached: u?.input_tokens_details?.cached_tokens ?? 0,
        // Diagnostic: zero writes AND zero reads means the request never
        // qualified for caching on this model (prefix under its minimum).
        cacheWrite: u?.input_tokens_details?.cache_write_tokens ?? 0,
        output: u?.output_tokens ?? 0,
      };
      model = event.response.model ?? args.model;
    } else if (event.type === "response.failed") {
      throw new Error(
        `model failed: ${event.response.error?.message ?? "unknown"}`
      );
    } else if (event.type === "response.incomplete") {
      throw new Error(
        `model response incomplete: ${event.response.incomplete_details?.reason ?? "unknown"}`
      );
    } else if (event.type === "error") {
      throw new Error(
        `stream error: ${event.message ?? event.code ?? "unknown"}`
      );
    }
  }

  return { text, usage, model };
}
