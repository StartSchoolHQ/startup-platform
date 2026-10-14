import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** `platform_settings` row `program_assistant`, parsed with defaults. */
export interface ProgramAssistantSettings {
  enabled: boolean;
  cadence: "daily" | "weekly";
  slackEnabled: boolean;
  slackChannel: string;
  model: string;
  /** Cohort name prefix; only rows whose `Cohort Name` starts with it count. */
  cohort: string;
  expectedCohortRows: [number, number];
  attendanceRulePct: number;
  attendanceMinSessions: number;
  unmappedFailPct: number;
  workerUrl: string;
  n8nWebhookBase: string;
}

export const PROGRAM_ASSISTANT_DEFAULTS: ProgramAssistantSettings = {
  enabled: false,
  cadence: "daily",
  slackEnabled: false,
  slackChannel: "#ops",
  model: "claude-sonnet-5-5",
  cohort: "Triffid Nebula",
  expectedCohortRows: [85, 95],
  attendanceRulePct: 75,
  attendanceMinSessions: 8,
  unmappedFailPct: 10,
  workerUrl: "",
  n8nWebhookBase: "",
};

export function parseProgramAssistantSettings(
  value: unknown
): ProgramAssistantSettings {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const d = PROGRAM_ASSISTANT_DEFAULTS;
  const num = (k: string, fallback: number) =>
    typeof raw[k] === "number" && Number.isFinite(raw[k] as number)
      ? (raw[k] as number)
      : fallback;
  const str = (k: string, fallback: string) =>
    typeof raw[k] === "string" ? (raw[k] as string) : fallback;
  const bool = (k: string, fallback: boolean) =>
    typeof raw[k] === "boolean" ? (raw[k] as boolean) : fallback;
  let bounds = d.expectedCohortRows;
  if (
    Array.isArray(raw.expected_cohort_rows) &&
    raw.expected_cohort_rows.length === 2 &&
    raw.expected_cohort_rows.every((n) => typeof n === "number")
  ) {
    const [lo, hi] = raw.expected_cohort_rows as [number, number];
    bounds = lo <= hi ? [lo, hi] : [hi, lo];
  }
  return {
    enabled: bool("enabled", d.enabled),
    cadence: raw.cadence === "weekly" ? "weekly" : "daily",
    slackEnabled: bool("slack_enabled", d.slackEnabled),
    slackChannel: str("slack_channel", d.slackChannel),
    model: str("model", d.model),
    cohort: str("cohort", d.cohort),
    expectedCohortRows: bounds,
    attendanceRulePct: num("attendance_rule_pct", d.attendanceRulePct),
    attendanceMinSessions: num(
      "attendance_min_sessions",
      d.attendanceMinSessions
    ),
    unmappedFailPct: num("unmapped_fail_pct", d.unmappedFailPct),
    workerUrl: str("worker_url", d.workerUrl),
    n8nWebhookBase: str("n8n_webhook_base", d.n8nWebhookBase).replace(
      /\/+$/,
      ""
    ),
  };
}

/**
 * Row shape for `set_platform_setting_v1`. Every key is written back so the
 * operational ones (worker_url, n8n_webhook_base, cadence) survive an edit
 * from the Settings card.
 */
export function toProgramAssistantSettingsRow(
  s: ProgramAssistantSettings
): Record<string, string | number | boolean | number[]> {
  return {
    enabled: s.enabled,
    cadence: s.cadence,
    run_time_riga: "08:00",
    slack_enabled: s.slackEnabled,
    slack_channel: s.slackChannel,
    model: s.model,
    cohort: s.cohort,
    expected_cohort_rows: s.expectedCohortRows,
    attendance_rule_pct: s.attendanceRulePct,
    attendance_min_sessions: s.attendanceMinSessions,
    unmapped_fail_pct: s.unmappedFailPct,
    worker_url: s.workerUrl,
    n8n_webhook_base: s.n8nWebhookBase,
  };
}

export async function getProgramAssistantSettings(
  supabase: SupabaseClient<Database>
): Promise<ProgramAssistantSettings> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "program_assistant")
    .maybeSingle();
  if (error) {
    throw new Error(`program_assistant settings unreadable: ${error.message}`);
  }
  return parseProgramAssistantSettings(data?.value);
}
