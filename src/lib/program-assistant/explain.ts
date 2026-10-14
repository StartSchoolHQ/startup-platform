import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { estimateCostUsd } from "@/lib/ai/pricing";
import { captureAiGeneration } from "@/lib/ai/telemetry";

/**
 * Claude explanations for flagged students (spec §5.3 step 5).
 *
 * Rules decide, Claude explains: the model receives numbers only (no name,
 * no email, no login) and returns one plain line on why the student is on
 * the list plus one suggested next step. A failure here never fails the run.
 */

export const EXPLAIN_PROMPT_VERSION = "2026-10-14.1";

/** Verdict row as `program_explain_inputs_v1` returns it. */
export interface ExplainInputRow {
  qwasar_user_id: number;
  name: string | null;
  track: string | null;
  study_type: string | null;
  week: number | null;
  requirement_this_week: string | null;
  requirement_last_week: string | null;
  phase: string | null;
  progress: number | null;
  prev_progress: number | null;
  prev_snapshot_date: string | null;
  trend: string;
  days_since_login: number | null;
  attendance_pct: number | null;
  attendance_sessions: number | null;
  attendance_incomplete: boolean;
  status: string;
  reason: string | null;
  not_evaluated_reason: string | null;
}

export const ExplanationSchema = z.object({
  line: z
    .string()
    .describe(
      "Why this student is on the list, in plain words, one sentence, max 160 characters, no name"
    ),
  next_step: z
    .string()
    .describe(
      "What the programme team should do this week for this student, one sentence, max 160 characters"
    ),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

export interface ExplanationRecord extends Explanation {
  qwasar_user_id: number;
  model: string;
  prompt_version: string;
  input_tokens: number;
  cached_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

/** Stable system block; cached across the whole run. */
export const EXPLAIN_SYSTEM = `You write for the StartSchool programme team. StartSchool is a startup school whose students also follow Qwasar, an online coding curriculum with a weekly minimum pace per track (FS = Fullstack, ML = Machine Learning; part-time students follow a slower PT timeline).

Every morning a rule engine checks each student's Qwasar progress and class attendance and marks them "On pace", "Watch" or "Talk to". You receive one student's numbers and the rule's reason. You do not change the verdict.

Write two things:
- line: why this student is on the list, in one plain sentence a busy teammate can read in three seconds. Lead with the strongest signal (zero progress, no login, behind the bar, attendance). Mention the week's requirement when it helps. Max 160 characters.
- next_step: the one most useful action for the team this week (a check-in call, a pairing session, asking about attendance, confirming a dropout, nothing if the signal is weak). Concrete, max 160 characters.

Rules: never invent facts, never guess a reason the numbers do not show, never mention names or emails, no praise, no hedging, no emoji. "attendance_incomplete" means attendance data is missing for this student, not that they were absent. A "not_evaluated_reason" means the pace bar does not apply this week (hackathon, break, catch-up); say so if relevant.`;

/** Only numbers reach the model. */
export function toModelInput(row: ExplainInputRow): Record<string, unknown> {
  return {
    track: row.track,
    study_type: row.study_type,
    week: row.week,
    phase: row.phase,
    requirement_this_week: row.requirement_this_week,
    requirement_last_week: row.requirement_last_week,
    progress_percent_now: row.progress,
    progress_percent_7_days_ago: row.prev_progress,
    trend: row.trend,
    days_since_last_login: row.days_since_login,
    attendance_percent: row.attendance_pct,
    attendance_sessions: row.attendance_sessions,
    attendance_incomplete: row.attendance_incomplete,
    status: row.status,
    rule_reason: row.reason,
    not_evaluated_reason: row.not_evaluated_reason,
  };
}

export function needsExplanation(row: ExplainInputRow): boolean {
  return row.status === "Talk to" || row.status === "Watch";
}

export interface ExplainOptions {
  client: Anthropic;
  model: string;
  runId: string;
  rows: ExplainInputRow[];
  concurrency?: number;
  deadlineAt?: number;
}

export interface ExplainResult {
  records: ExplanationRecord[];
  failed: number;
  skipped: number;
  costUsd: number;
}

async function explainOne(
  opts: ExplainOptions,
  row: ExplainInputRow
): Promise<ExplanationRecord> {
  const input = JSON.stringify(toModelInput(row));
  const t0 = Date.now();
  let response: Awaited<ReturnType<Anthropic["messages"]["parse"]>> | null =
    null;
  let error: unknown;
  try {
    response = await opts.client.messages.parse({
      model: opts.model,
      max_tokens: 400,
      system: [
        {
          type: "text",
          text: EXPLAIN_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: input }],
      output_config: {
        effort: "low",
        format: zodOutputFormat(ExplanationSchema),
      },
    });
  } catch (e) {
    error = e;
  }
  const usage = {
    input:
      (response?.usage.input_tokens ?? 0) +
      (response?.usage.cache_read_input_tokens ?? 0) +
      (response?.usage.cache_creation_input_tokens ?? 0),
    cached: response?.usage.cache_read_input_tokens ?? 0,
    cacheWrite: response?.usage.cache_creation_input_tokens ?? 0,
    output: response?.usage.output_tokens ?? 0,
  };
  const parsed = response?.parsed_output as Explanation | null | undefined;
  captureAiGeneration({
    distinctId: "program-assistant",
    traceId: opts.runId,
    sessionId: null,
    spanName: "program_assistant.explain",
    feature: "program_assistant",
    model: opts.model,
    input: [
      { role: "system", content: EXPLAIN_SYSTEM },
      { role: "user", content: input },
    ],
    output: parsed ? JSON.stringify(parsed) : null,
    usage,
    latencySeconds: (Date.now() - t0) / 1000,
    stream: false,
    error,
    properties: { qwasar_user_id: row.qwasar_user_id, status: row.status },
  });
  if (error) throw error;
  if (!parsed) {
    throw new Error(
      `no structured output (stop_reason ${response?.stop_reason ?? "unknown"})`
    );
  }
  return {
    qwasar_user_id: row.qwasar_user_id,
    line: parsed.line.slice(0, 400),
    next_step: parsed.next_step.slice(0, 400),
    model: opts.model,
    prompt_version: EXPLAIN_PROMPT_VERSION,
    input_tokens: usage.input,
    cached_tokens: usage.cached,
    output_tokens: usage.output,
    cost_usd: estimateCostUsd(opts.model, usage),
  };
}

/**
 * Explains every Talk to / Watch row, a few at a time. Individual failures
 * are counted, not thrown; the caller stores whatever came back.
 */
export async function explainFlagged(
  opts: ExplainOptions
): Promise<ExplainResult> {
  const targets = opts.rows.filter(needsExplanation);
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const records: ExplanationRecord[] = [];
  let failed = 0;
  let skipped = 0;
  let next = 0;

  const worker = async () => {
    while (next < targets.length) {
      const row = targets[next++];
      if (opts.deadlineAt && Date.now() > opts.deadlineAt) {
        skipped++;
        continue;
      }
      try {
        records.push(await explainOne(opts, row));
      } catch (e) {
        failed++;
        console.error(
          "[program-assistant] explanation failed",
          row.qwasar_user_id,
          e instanceof Error ? e.message : e
        );
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, worker)
  );
  records.sort((a, b) => a.qwasar_user_id - b.qwasar_user_id);
  return {
    records,
    failed,
    skipped,
    costUsd: Number(records.reduce((s, r) => s + r.cost_usd, 0).toFixed(5)),
  };
}
