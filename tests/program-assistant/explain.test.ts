import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import {
  EXPLAIN_PROMPT_VERSION,
  explainFlagged,
  needsExplanation,
  toModelInput,
  type ExplainInputRow,
} from "@/lib/program-assistant/explain";
import { buildSlackDigest } from "@/lib/program-assistant/slack";

function row(over: Partial<ExplainInputRow>): ExplainInputRow {
  return {
    qwasar_user_id: 1,
    name: "Ann Able",
    track: "FS",
    study_type: "full-time",
    week: 6,
    requirement_this_week: "Bootcamp C Quest00 – Quest05 · my square",
    requirement_last_week: "Catch-up week: finish Preseason",
    phase: "S01 Arc 01",
    progress: 85,
    prev_progress: 85,
    prev_snapshot_date: "2026-10-05",
    trend: "flat",
    days_since_login: 18,
    attendance_pct: 71.7,
    attendance_sessions: 46,
    attendance_incomplete: false,
    status: "Talk to",
    reason:
      "behind: Preseason 85% < 98%; no login 18 d; attendance 71.7% (< 75%)",
    not_evaluated_reason: null,
    ...over,
  };
}

/** Fake Anthropic client: records requests, answers with structured output. */
function fakeClient(opts: { failFor?: number[] } = {}) {
  const requests: Array<Record<string, unknown>> = [];
  const client = {
    messages: {
      parse: async (req: Record<string, unknown>) => {
        requests.push(req);
        const input = JSON.parse(
          (req.messages as Array<{ content: string }>)[0].content
        );
        if (opts.failFor?.includes(input.days_since_last_login)) {
          throw new Error("boom");
        }
        return {
          stop_reason: "end_turn",
          parsed_output: {
            line: `Behind at ${input.progress_percent_now}% with no login for ${input.days_since_last_login} days.`,
            next_step: "Call this week.",
          },
          usage: {
            input_tokens: 300,
            cache_read_input_tokens: 1500,
            cache_creation_input_tokens: 0,
            output_tokens: 60,
          },
        };
      },
    },
  };
  return { client: client as unknown as Anthropic, requests };
}

describe("toModelInput", () => {
  it("sends numbers and reasons only, never the name", () => {
    const input = toModelInput(row({}));
    expect(JSON.stringify(input)).not.toContain("Ann");
    expect(input).toMatchObject({
      track: "FS",
      week: 6,
      progress_percent_now: 85,
      days_since_last_login: 18,
      attendance_percent: 71.7,
      status: "Talk to",
    });
  });

  it("flags only Talk to and Watch", () => {
    expect(needsExplanation(row({ status: "Talk to" }))).toBe(true);
    expect(needsExplanation(row({ status: "Watch" }))).toBe(true);
    expect(needsExplanation(row({ status: "On pace" }))).toBe(false);
    expect(needsExplanation(row({ status: "Not tracked" }))).toBe(false);
  });
});

describe("explainFlagged", () => {
  it("explains flagged rows with a cached system block and records cost", async () => {
    const { client, requests } = fakeClient();
    const rows = [
      row({ qwasar_user_id: 1 }),
      row({ qwasar_user_id: 2, status: "Watch", days_since_login: 3 }),
      row({ qwasar_user_id: 3, status: "On pace" }),
    ];
    const out = await explainFlagged({
      client,
      model: "claude-sonnet-5-5",
      runId: "run-1",
      rows,
    });
    expect(requests).toHaveLength(2);
    const sys = requests[0].system as Array<{
      text: string;
      cache_control?: unknown;
    }>;
    expect(sys[0].cache_control).toEqual({ type: "ephemeral" });
    expect(requests[0].model).toBe("claude-sonnet-5-5");
    expect(JSON.stringify(requests)).not.toContain("Ann");
    expect(out.records.map((r) => r.qwasar_user_id)).toEqual([1, 2]);
    expect(out.records[0].prompt_version).toBe(EXPLAIN_PROMPT_VERSION);
    expect(out.records[0].cached_tokens).toBe(1500);
    expect(out.records[0].input_tokens).toBe(1800);
    // 300 fresh × $2 + 1500 cached × $0.2 + 60 out × $10, per 1M
    expect(out.records[0].cost_usd).toBeCloseTo(0.0015, 5);
    expect(out.failed).toBe(0);
  });

  it("counts individual failures instead of throwing", async () => {
    const { client } = fakeClient({ failFor: [18] });
    const out = await explainFlagged({
      client,
      model: "claude-sonnet-5-5",
      runId: "run-1",
      rows: [
        row({ qwasar_user_id: 1 }),
        row({ qwasar_user_id: 2, days_since_login: 2 }),
      ],
    });
    expect(out.failed).toBe(1);
    expect(out.records.map((r) => r.qwasar_user_id)).toEqual([2]);
  });
});

describe("buildSlackDigest", () => {
  it("summarises counts and lists Talk to students with their line", () => {
    const text = buildSlackDigest({
      snapshotDate: "2026-10-14",
      rows: [
        row({ qwasar_user_id: 1 }),
        row({ qwasar_user_id: 2, name: "Bob", status: "Watch" }),
        row({ qwasar_user_id: 3, name: "Cid", status: "On pace", track: "ML" }),
        row({
          qwasar_user_id: 4,
          name: "Dee",
          status: "Not tracked",
          study_type: "part-time",
        }),
      ],
      explanations: [
        {
          qwasar_user_id: 1,
          line: "Behind and quiet for 18 days.",
          next_step: "Call.",
          model: "m",
          prompt_version: "v",
          input_tokens: 0,
          cached_tokens: 0,
          output_tokens: 0,
          cost_usd: 0,
        },
      ],
      dataIssues: 2,
      pageUrl: "https://x.test/dashboard/admin/tech-module",
    });
    expect(text).toContain("week 6");
    expect(text).toContain("Talk to 1 (FS 1 · ML 0)");
    expect(text).toContain("Watch 1");
    expect(text).toContain("• Ann Able — Behind and quiet for 18 days.");
    expect(text).not.toContain("Bob —");
    expect(text).toContain("Data to fix: 2");
    expect(text).toContain("https://x.test/dashboard/admin/tech-module");
  });
});
