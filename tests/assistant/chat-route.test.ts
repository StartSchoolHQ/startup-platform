/**
 * Drives POST /api/assistant/chat with fake Supabase + OpenAI clients. Covers
 * the failure paths the pure adapter test cannot: model failure events, empty
 * replies, snapshot errors after the RPC counted the message, and a client
 * that disconnects mid-stream. No network, no DB.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type Event = Record<string, unknown> & { type: string };

const state = {
  events: [] as Event[],
  delayMs: 0,
  inserted: [] as Record<string, unknown>[],
  snapshotThrows: false,
  rpc: {
    data: {
      thread_id: "11111111-1111-4111-8111-111111111111",
      message_id: "22222222-2222-4222-8222-222222222222",
      remaining_today: 24,
    } as unknown,
    error: null as null | { message: string },
  },
};

function chain(result: unknown) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "limit"]) {
    q[m] = () => q;
  }
  q.then = (resolve: (v: unknown) => void) => resolve(result);
  return q;
}

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
    rpc: async () => state.rpc,
    from: () => chain({ data: [{ role: "user", content: "hi" }], error: null }),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        state.inserted.push(row);
        return { error: null };
      },
    }),
  }),
}));

vi.mock("@/lib/assistant/settings", () => ({
  getAssistantSettings: async () => ({
    enabled: true,
    model: "gpt-5.4-mini",
    dailyLimit: 25,
    historyTurns: 10,
    reasoningEffort: "low",
  }),
}));

vi.mock("@/lib/assistant/snapshot", () => ({
  loadStudentSnapshot: async () => {
    if (state.snapshotThrows) throw new Error("overview: boom");
    return {
      name: "T",
      role: "user",
      xp: 0,
      phases: [],
      inProgress: [],
      nextUp: null,
      recurring: [],
    };
  },
  loadPageSummary: async () => ({ route: "/dashboard", task: null }),
}));

vi.mock("@/lib/ai-review/openai-client", () => ({
  getOpenAI: () => ({
    withOptions: () => ({
      responses: {
        create: async () => {
          const events = state.events;
          const delay = state.delayMs;
          return (async function* () {
            for (const e of events) {
              if (delay) await new Promise((r) => setTimeout(r, delay));
              yield e;
            }
          })();
        },
      },
    }),
  }),
}));

const completed = (text = true): Event => ({
  type: "response.completed",
  response: {
    model: "gpt-5.4-mini",
    usage: {
      input_tokens: text ? 100 : 10,
      input_tokens_details: { cached_tokens: 70 },
      output_tokens: text ? 5 : 0,
    },
  },
});

async function post(body: unknown) {
  const { POST } = await import("@/app/api/assistant/chat/route");
  return POST(
    new NextRequest("http://localhost/api/assistant/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

const body = { content: "hello", pageContext: { route: "/dashboard" } };

async function flush(ms = 50) {
  await new Promise((r) => setTimeout(r, ms));
}

beforeEach(() => {
  state.events = [];
  state.delayMs = 0;
  state.inserted = [];
  state.snapshotThrows = false;
});

describe("POST /api/assistant/chat", () => {
  it("streams the reply and records the full row with usage and cost", async () => {
    state.events = [
      { type: "response.output_text.delta", delta: "Hi" },
      { type: "response.output_text.delta", delta: " there" },
      completed(),
    ];
    const res = await post(body);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Startie-Thread-Id")).toBe(
      "11111111-1111-4111-8111-111111111111"
    );
    expect(res.headers.get("X-Startie-Remaining")).toBe("24");
    expect(await res.text()).toBe("Hi there");
    await flush();
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({
      role: "assistant",
      content: "Hi there",
      model: "gpt-5.4-mini",
      input_tokens: 100,
      cached_tokens: 70,
      output_tokens: 5,
    });
    expect(Number(state.inserted[0].cost_usd)).toBeGreaterThan(0);
  });

  it("writes an apology row when the model reports a failure event", async () => {
    state.events = [
      { type: "response.output_text.delta", delta: "Hi" },
      {
        type: "response.failed",
        response: { error: { message: "overloaded" } },
      },
    ];
    const res = await post(body);
    const text = await res.text();
    expect(text).toContain("Hi");
    expect(text).toMatch(/snag/i);
    await flush();
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({
      role: "assistant",
      model: null,
      cost_usd: 0,
    });
    expect(String(state.inserted[0].content)).toMatch(/snag/i);
  });

  it("treats an empty completed reply as a failure", async () => {
    state.events = [completed(false)];
    const res = await post(body);
    expect(await res.text()).toMatch(/snag/i);
    await flush();
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({ model: null, cost_usd: 0 });
  });

  it("still answers with the thread id and an apology row when the snapshot fails after the RPC", async () => {
    state.snapshotThrows = true;
    const res = await post(body);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Startie-Thread-Id")).toBe(
      "11111111-1111-4111-8111-111111111111"
    );
    expect(await res.text()).toMatch(/snag/i);
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({
      role: "assistant",
      model: null,
      cost_usd: 0,
    });
  });

  it("records the full reply even when the client disconnects mid-stream", async () => {
    state.delayMs = 20;
    state.events = [
      { type: "response.output_text.delta", delta: "Hi" },
      { type: "response.output_text.delta", delta: " there" },
      completed(),
    ];
    const res = await post(body);
    const reader = res.body!.getReader();
    await reader.read(); // "Hi"
    await reader.cancel();
    await flush(200);
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({
      content: "Hi there",
      model: "gpt-5.4-mini",
      output_tokens: 5,
    });
  });

  it("maps a limit error from the RPC to 429 with the reset time", async () => {
    state.rpc = {
      data: null,
      error: { message: "ASSISTANT_LIMIT_REACHED" },
    };
    const res = await post(body);
    expect(res.status).toBe(429);
    const json = (await res.json()) as { remaining: number; resetsAt: string };
    expect(json.remaining).toBe(0);
    expect(json.resetsAt).toMatch(/T00:00:00\.000Z$/);
    expect(state.inserted).toHaveLength(0);
    state.rpc = {
      data: {
        thread_id: "11111111-1111-4111-8111-111111111111",
        message_id: "22222222-2222-4222-8222-222222222222",
        remaining_today: 24,
      },
      error: null,
    };
  });
});
