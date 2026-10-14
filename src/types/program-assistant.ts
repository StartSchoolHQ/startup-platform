/**
 * Payload of `get_program_assistant_latest_v1()` (Admin → People → Tech
 * module). Mirrors the SQL in migration `program_assistant_explanations_v1`.
 */

export type VerdictStatus = "On pace" | "Watch" | "Talk to" | "Not tracked";
export type Trend = "up" | "flat" | "down" | "na";

export interface ProgramRun {
  id: string;
  kind: "scheduled" | "adhoc";
  status: "running" | "done" | "failed";
  started_at: string;
  finished_at: string | null;
  snapshot_date: string | null;
  steps: Array<{
    step: string;
    status: "ok" | "warning" | "failed" | "skipped";
    ms: number;
    at?: string;
    error?: string;
    [key: string]: unknown;
  }>;
  error: string | null;
  slack_message: string | null;
  slack_posted_at: string | null;
}

export interface VerdictRow {
  qwasar_user_id: number;
  snapshot_date: string;
  name: string | null;
  email: string | null;
  login: string | null;
  track: string | null;
  study_type: string | null;
  week: number | null;
  progress: number | null;
  prev_progress: number | null;
  prev_snapshot_date: string | null;
  trend: Trend;
  days_since_login: number | null;
  attendance_pct: number | null;
  attendance_sessions: number | null;
  attendance_incomplete: boolean;
  status: VerdictStatus;
  reason: string | null;
  not_evaluated_reason: string | null;
  user_id: string | null;
  line: string | null;
  next_step: string | null;
}

export interface DataIssueRow {
  id: number;
  run_id: string;
  qwasar_user_id: number | null;
  kind: string;
  detail: string;
  suggested_fix: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface TimelineRow {
  track: "FS" | "ML" | "PT";
  week: number;
  phase: string;
  requirement: string;
  flag: string;
  threshold_module: string | null;
  threshold_percent: number | null;
}

export interface ProgramAssistantLatest {
  latest_run: ProgramRun | null;
  run: ProgramRun | null;
  stale_days: number | null;
  settings: Record<string, unknown> | null;
  verdicts: VerdictRow[];
  data_issues: DataIssueRow[];
  timeline: TimelineRow[];
}
