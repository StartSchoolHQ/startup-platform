import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/ai/claude";
import { buildDataIssues, checkCohortSize } from "./checks";
import { buildSnapshotRows, csvToRecords, missingColumns } from "./csv";
import {
  explainFlagged,
  needsExplanation,
  type ExplainInputRow,
  type ExplanationRecord,
} from "./explain";
import { callProgramWebhook, sendProgramAlert, WEBHOOK_PATHS } from "./n8n";
import { buildSlackDigest } from "./slack";
import { postDigestToSlack, slackWebhookUrl } from "./slack-post";
import {
  fetchQwasarCsv,
  QwasarAuthError,
  QwasarImportError,
} from "./qwasar-client";
import {
  getProgramAssistantSettings,
  type ProgramAssistantSettings,
} from "./settings";
import type {
  DataIssue,
  RunKind,
  SnapshotRow,
  StepRecord,
  StudentTrackRow,
} from "./types";

/**
 * The daily run, phase 1 (spec §5.3, plan 2026-10-14):
 *
 *   start run ─ attendance_sync ─ track_sync ─ import ─ store_csv ─
 *   snapshot ─ verdicts ─ data_issues ─ explain ─ sheet_refresh ─ finish
 *
 * Reader steps, the CSV copy and the sheet refresh are warnings when they
 * fail; import, snapshot and verdicts are fatal (run `failed`, alert sent,
 * yesterday's verdicts untouched). Claude explains flagged students off the
 * critical path, and the Slack digest is built every run and only stored.
 */

type Admin = SupabaseClient<Database>;

export interface RunEnv {
  /** `PROGRAM_ASSISTANT_SECRET`: outgoing header for the n8n webhooks. */
  secret: string;
  qwasarUsername: string;
  qwasarPassword: string;
}

export interface RunOptions {
  kind: RunKind;
  triggeredBy?: string | null;
  env?: RunEnv;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Test seam; production resolves the shared client lazily. */
  anthropic?: Anthropic;
  deadlineAt?: number;
}

export interface RunResult {
  runId: string;
  status: "done" | "failed";
  snapshotDate: string;
  steps: StepRecord[];
  error?: string;
}

class StepFailure extends Error {
  constructor(
    readonly step: string,
    message: string
  ) {
    super(message);
  }
}

export const RUN_IN_PROGRESS = "program_run_in_progress";

/** Calendar date in Riga, the date the snapshot is filed under. */
export function rigaDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Riga",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function readRunEnv(): RunEnv {
  return {
    secret: process.env.PROGRAM_ASSISTANT_SECRET ?? "",
    qwasarUsername: process.env.QWASAR_USERNAME ?? "",
    qwasarPassword: process.env.QWASAR_PASSWORD ?? "",
  };
}

async function rpc<T>(
  admin: Admin,
  fn: Parameters<Admin["rpc"]>[0],
  args: Record<string, unknown>
): Promise<T> {
  const { data, error } = await admin.rpc(fn, args as never);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

export async function runProgramAssistant(
  admin: Admin,
  opts: RunOptions
): Promise<RunResult> {
  const settings = await getProgramAssistantSettings(admin);
  const env = opts.env ?? readRunEnv();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const snapshotDate = rigaDate((opts.now ?? (() => new Date()))());

  const runId = await rpc<string>(admin, "program_run_start_v1", {
    p_kind: opts.kind,
    p_triggered_by: opts.triggeredBy ?? null,
  });

  const steps: StepRecord[] = [];
  const record = async (rec: StepRecord) => {
    steps.push(rec);
    await rpc(admin, "program_run_step_v1", {
      p_run_id: runId,
      p_step: rec as unknown as Json,
    });
  };

  /** Runs one step; a throw becomes `warning` (non-critical) or `failed`. */
  const step = async <T>(
    name: string,
    critical: boolean,
    fn: () => Promise<{ value: T; log?: Record<string, unknown> }>
  ): Promise<T | null> => {
    const t0 = Date.now();
    try {
      const out = await fn();
      await record({
        step: name,
        status: "ok",
        ms: Date.now() - t0,
        ...(out.log ?? {}),
      });
      return out.value;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await record({
        step: name,
        status: critical ? "failed" : "warning",
        ms: Date.now() - t0,
        error: message,
      });
      if (critical) throw new StepFailure(name, message);
      return null;
    }
  };

  const webhook = (path: string) => async () => {
    if (!settings.n8nWebhookBase) {
      return { value: null, log: { skipped: "n8n_webhook_base unset" } };
    }
    const response = await callProgramWebhook({
      base: settings.n8nWebhookBase,
      path,
      secret: env.secret,
      body: { run_id: runId, snapshot_date: snapshotDate },
      timeoutMs: 90_000,
      fetchImpl,
    });
    return { value: response, log: { response } };
  };

  try {
    await step("attendance_sync", false, webhook(WEBHOOK_PATHS.attendanceSync));
    await step("track_sync", false, webhook(WEBHOOK_PATHS.trackSync));

    const imported = await step("import", true, () =>
      importQwasar({ admin, settings, env, fetchImpl })
    );
    if (!imported) throw new StepFailure("import", "no import result");

    await step("store_csv", false, async () => {
      const path = `qwasar/${snapshotDate}-${runId}.csv`;
      const { error } = await admin.storage
        .from("program-imports")
        .upload(path, imported.csv, { contentType: "text/csv", upsert: true });
      if (error) throw new Error(error.message);
      return { value: path, log: { path, bytes: imported.bytes } };
    });

    await step("snapshot", true, async () => {
      const result = await rpc<Record<string, unknown>>(
        admin,
        "program_snapshot_upsert_v1",
        {
          p_snapshot_date: snapshotDate,
          p_kind: opts.kind,
          p_rows: imported.rows as unknown as Json,
        }
      );
      return { value: result, log: { ...result, snapshot_date: snapshotDate } };
    });

    await step("verdicts", true, async () => {
      const result = await rpc<Record<string, unknown>>(
        admin,
        "program_verdicts_write_v1",
        { p_run_id: runId, p_snapshot_date: snapshotDate }
      );
      return { value: result, log: { ...result } };
    });

    await step("data_issues", false, async () => {
      const n = await rpc<number>(admin, "program_data_issue_replace_v1", {
        p_run_id: runId,
        p_issues: imported.issues as unknown as Json,
      });
      return {
        value: n,
        log: {
          written: n,
          unmapped: imported.unmapped,
          unmapped_pct: imported.unmappedPct,
        },
      };
    });

    // Claude explains Talk to / Watch rows (numbers only). Never fatal.
    let inputs: ExplainInputRow[] = [];
    let explanations: ExplanationRecord[] = [];
    await step("explain", false, async () => {
      inputs =
        (await rpc<ExplainInputRow[]>(admin, "program_explain_inputs_v1", {
          p_run_id: runId,
        })) ?? [];
      const flagged = inputs.filter(needsExplanation).length;
      if (flagged === 0) {
        return { value: null, log: { flagged: 0, skipped: "nothing flagged" } };
      }
      const client = opts.anthropic ?? getAnthropic();
      const out = await explainFlagged({
        client,
        model: settings.model,
        runId,
        rows: inputs,
        deadlineAt: opts.deadlineAt,
      });
      explanations = out.records;
      if (out.records.length > 0) {
        await rpc(admin, "program_explanations_write_v1", {
          p_run_id: runId,
          p_rows: out.records as unknown as Json,
        });
      }
      const log = {
        flagged,
        written: out.records.length,
        failed: out.failed,
        skipped: out.skipped,
        cost_usd: out.costUsd,
        model: settings.model,
      };
      if (out.failed > 0 && out.records.length === 0) {
        throw new Error(`all ${out.failed} explanation calls failed`);
      }
      return { value: out, log };
    });

    const slackMessage = buildSlackDigest({
      snapshotDate,
      rows: inputs,
      explanations,
      dataIssues: imported.issues.length,
      pageUrl: pageUrlFrom(settings.workerUrl),
    });

    await step("sheet_refresh", false, async () => {
      const requestId = await rpc<number>(
        admin,
        "program_request_sheet_refresh_v1",
        {}
      );
      return { value: requestId, log: { request_id: requestId } };
    });

    // Scheduled runs post when the switch is on; ad-hoc runs never post by
    // themselves (the admin page has a Post to Slack button for that).
    await step("slack_post", false, async () => {
      if (!settings.slackEnabled) {
        return { value: null, log: { skipped: "slack_enabled off" } };
      }
      if (opts.kind !== "scheduled") {
        return {
          value: null,
          log: { skipped: "manual run; use Post to Slack" },
        };
      }
      const webhookUrl = slackWebhookUrl();
      if (!webhookUrl) {
        throw new Error("SLACK_WEBHOOK_URL not set");
      }
      await postDigestToSlack({ webhookUrl, text: slackMessage, fetchImpl });
      await rpc(admin, "program_run_mark_posted_v1", { p_run_id: runId });
      return { value: true, log: { posted: true } };
    });

    await rpc(admin, "program_run_finish_v1", {
      p_run_id: runId,
      p_status: "done",
      p_snapshot_date: snapshotDate,
      p_slack_message: slackMessage,
    });
    return { runId, status: "done", snapshotDate, steps };
  } catch (e) {
    const failure =
      e instanceof StepFailure
        ? e
        : new StepFailure("run", e instanceof Error ? e.message : String(e));
    const error = `${failure.step}: ${failure.message}`;
    await rpc(admin, "program_run_finish_v1", {
      p_run_id: runId,
      p_status: "failed",
      p_error: error,
    }).catch((err) =>
      console.error("[program-assistant] finish(failed) failed", err)
    );
    await sendProgramAlert({
      base: settings.n8nWebhookBase,
      secret: env.secret,
      subject: `Program assistant run failed at ${failure.step}`,
      text: [
        `Run ${runId} (${opts.kind}, snapshot ${snapshotDate}) failed.`,
        ``,
        error,
        ``,
        `Steps so far: ${steps.map((s) => `${s.step}=${s.status}`).join(", ")}`,
        `Yesterday's snapshot and verdicts are untouched. Fix the cause, then run:`,
        `select public.program_kick_run_v1('adhoc');`,
      ].join("\n"),
      fetchImpl,
    });
    return { runId, status: "failed", snapshotDate, steps, error };
  }
}

/** Admin page link for the digest, derived from the configured route URL. */
export function pageUrlFrom(workerUrl: string): string {
  try {
    return new URL("/dashboard/admin/tech-module", workerUrl).toString();
  } catch {
    return "/dashboard/admin/tech-module";
  }
}

interface ImportDeps {
  admin: Admin;
  settings: ProgramAssistantSettings;
  env: RunEnv;
  fetchImpl: typeof fetch;
}

interface ImportResult {
  csv: string;
  bytes: number;
  rows: SnapshotRow[];
  issues: DataIssue[];
  unmapped: number;
  unmappedPct: number;
}

/**
 * Download + validate + build rows + data issues. Throws on anything that
 * must stop the run; the caller turns it into a failed `import` step.
 */
async function importQwasar(
  deps: ImportDeps
): Promise<{ value: ImportResult; log: Record<string, unknown> }> {
  const { env, settings, fetchImpl } = deps;
  if (!env.qwasarUsername || !env.qwasarPassword) {
    throw new Error("QWASAR_USERNAME / QWASAR_PASSWORD not set");
  }

  // One retry on a transient error, never on an auth failure.
  let download;
  try {
    download = await fetchQwasarCsv({
      username: env.qwasarUsername,
      password: env.qwasarPassword,
      fetchImpl,
    });
  } catch (e) {
    if (e instanceof QwasarAuthError) throw e;
    if (!(e instanceof QwasarImportError)) throw e;
    download = await fetchQwasarCsv({
      username: env.qwasarUsername,
      password: env.qwasarPassword,
      fetchImpl,
    });
  }

  const { header, records } = csvToRecords(download.csv);
  const missing = missingColumns(header);
  if (missing.length > 0) {
    throw new Error(
      `export header is missing ${missing.join(", ")}; Qwasar changed the export`
    );
  }
  const built = buildSnapshotRows(header, records, settings.cohort);
  const cohort = checkCohortSize(
    built.summary.students,
    settings.expectedCohortRows
  );
  if (!cohort.ok) throw new Error(cohort.message);

  const tracks = await rpc<StudentTrackRow[]>(
    deps.admin,
    "program_student_tracks_v1",
    {}
  );
  const issueBuild = buildDataIssues(built.rows, tracks ?? []);
  if (issueBuild.unmappedPct > settings.unmappedFailPct) {
    throw new Error(
      `${issueBuild.unmapped} active students (${issueBuild.unmappedPct}%) have no student_track row, above the ${settings.unmappedFailPct}% limit; run the track sync / fix the sheet`
    );
  }

  return {
    value: {
      csv: download.csv,
      bytes: download.bytes,
      rows: built.rows,
      issues: issueBuild.issues,
      unmapped: issueBuild.unmapped,
      unmappedPct: issueBuild.unmappedPct,
    },
    log: {
      bytes: download.bytes,
      ...built.summary,
      tracks: tracks?.length ?? 0,
      issues: issueBuild.issues.length,
    },
  };
}
