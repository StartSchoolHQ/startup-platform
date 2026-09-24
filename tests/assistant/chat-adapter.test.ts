import { describe, expect, it } from "vitest";
import type OpenAI from "openai";
import { streamStartieReply } from "@/lib/assistant/chat";

type Event =
  | { type: "response.output_text.delta"; delta: string }
  | {
      type: "response.completed";
      response: {
        model: string;
        usage: {
          input_tokens: number;
          input_tokens_details: { cached_tokens: number };
          output_tokens: number;
        };
      };
    }
  | { type: "response.created" };

function fakeOpenAI(events: Event[], failAfter?: number) {
  const calls: unknown[] = [];
  async function* iterate() {
    let i = 0;
    for (const event of events) {
      if (failAfter !== undefined && i === failAfter) {
        throw new Error("stream died");
      }
      i += 1;
      yield event;
    }
  }
  return {
    calls,
    client: {
      responses: {
        create: async (body: unknown) => {
          calls.push(body);
          return iterate();
        },
      },
    } as unknown as OpenAI,
  };
}

const completed: Event = {
  type: "response.completed",
  response: {
    model: "gpt-5.4-mini-2026-08-01",
    usage: {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 70 },
      output_tokens: 5,
    },
  },
};

async function drain(gen: AsyncGenerator<string, unknown>) {
  const chunks: string[] = [];
  let result: IteratorResult<string, unknown>;
  while (!(result = await gen.next()).done) chunks.push(result.value);
  return { chunks, returned: result.value };
}

describe("streamStartieReply", () => {
  it("yields text deltas and returns usage from the completed event", async () => {
    const { client, calls } = fakeOpenAI([
      { type: "response.created" },
      { type: "response.output_text.delta", delta: "Hi" },
      { type: "response.output_text.delta", delta: " there" },
      completed,
    ]);
    const gen = streamStartieReply({
      openai: client,
      model: "gpt-5.4-mini",
      effort: "low",
      system: "SYSTEM",
      context: "CONTEXT",
      history: [{ role: "user", content: "hello" }],
      promptCacheKey: "startie:test",
    });
    const { chunks, returned } = await drain(gen);
    expect(chunks).toEqual(["Hi", " there"]);
    expect(returned).toEqual({
      text: "Hi there",
      usage: { input: 100, cached: 70, output: 5 },
      model: "gpt-5.4-mini-2026-08-01",
    });
    const body = calls[0] as Record<string, unknown>;
    expect(body.stream).toBe(true);
    expect(body.model).toBe("gpt-5.4-mini");
    expect(body.prompt_cache_key).toBe("startie:test");
    expect(body.reasoning).toEqual({ effort: "low" });
    const input = body.input as { role: string; content: string }[];
    expect(input.map((m) => m.role)).toEqual(["system", "developer", "user"]);
    expect(input[0].content).toBe("SYSTEM");
    expect(input[1].content).toBe("CONTEXT");
  });

  it("rethrows a mid-stream failure after what already streamed", async () => {
    const { client } = fakeOpenAI(
      [
        { type: "response.output_text.delta", delta: "Hi" },
        { type: "response.output_text.delta", delta: " there" },
        completed,
      ],
      1
    );
    const gen = streamStartieReply({
      openai: client,
      model: "gpt-5.4-mini",
      effort: "low",
      system: "S",
      context: "C",
      history: [],
      promptCacheKey: "k",
    });
    const first = await gen.next();
    expect(first.value).toBe("Hi");
    await expect(gen.next()).rejects.toThrow("stream died");
  });

  it("falls back to the requested model and zero usage when no completed event arrives", async () => {
    const { client } = fakeOpenAI([
      { type: "response.output_text.delta", delta: "ok" },
    ]);
    const gen = streamStartieReply({
      openai: client,
      model: "gpt-5.4-mini",
      effort: "medium",
      system: "S",
      context: "C",
      history: [],
      promptCacheKey: "k",
    });
    const { returned } = await drain(gen);
    expect(returned).toEqual({
      text: "ok",
      usage: { input: 0, cached: 0, output: 0 },
      model: "gpt-5.4-mini",
    });
  });
});

describe("streamStartieReply failure events", () => {
  const args = {
    model: "gpt-5.4-mini",
    effort: "low" as const,
    system: "S",
    context: "C",
    history: [],
    promptCacheKey: "k",
  };

  it("throws on response.failed", async () => {
    const { client } = fakeOpenAI([
      { type: "response.output_text.delta", delta: "Hi" },
      {
        type: "response.failed",
        response: { error: { message: "overloaded" } },
      } as unknown as Event,
    ]);
    const gen = streamStartieReply({ ...args, openai: client });
    expect((await gen.next()).value).toBe("Hi");
    await expect(gen.next()).rejects.toThrow(/overloaded/);
  });

  it("throws on a stream error event", async () => {
    const { client } = fakeOpenAI([
      {
        type: "error",
        message: "bad gateway",
        code: "502",
      } as unknown as Event,
    ]);
    const gen = streamStartieReply({ ...args, openai: client });
    await expect(gen.next()).rejects.toThrow(/bad gateway/);
  });

  it("throws on response.incomplete", async () => {
    const { client } = fakeOpenAI([
      {
        type: "response.incomplete",
        response: { incomplete_details: { reason: "max_output_tokens" } },
      } as unknown as Event,
    ]);
    const gen = streamStartieReply({ ...args, openai: client });
    await expect(gen.next()).rejects.toThrow(/max_output_tokens/);
  });
});
