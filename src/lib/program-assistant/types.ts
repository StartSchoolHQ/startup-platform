/**
 * Program assistant — shared types for the daily run.
 * Spec: docs/internal/superpowers/specs/2026-10-13-program-assistant-design.md
 *
 * Everything here is keyed by `qwasar_user_id`. Platform `users` are never
 * touched by this module: it is a standalone add-on that reads Qwasar and the
 * attendance/track sheets and writes only into the `qwasar` and `program`
 * schemas through service-role RPCs.
 */

export type RunKind = "scheduled" | "adhoc";

export type StepStatus = "ok" | "warning" | "failed" | "skipped";

export interface StepRecord {
  step: string;
  status: StepStatus;
  ms: number;
  /** Counts, messages, anything small enough to keep in the run log. */
  [key: string]: unknown;
}

/** One row of `qwasar.progress_snapshot` as the upsert RPC expects it. */
export interface SnapshotRow {
  qwasar_user_id: number;
  login: string;
  name: string;
  email: string;
  status: string;
  cohort: string;
  /** ISO timestamp (UTC) or null when the student never logged in. */
  last_login_at: string | null;
  module: string;
  percent: number;
}

/** One row of `qwasar.student_track` as `program_student_tracks_v1` returns it. */
export interface StudentTrackRow {
  qwasar_user_id: number;
  email: string | null;
  name: string | null;
  tech_track: string | null;
  study_type: string | null;
  sheet_status: string | null;
}

export type DataIssueKind =
  | "dropout_but_active"
  | "wrong_track"
  | "active_no_track_row"
  | "unmapped_student"
  | "attendance_unmatched_email"
  | "import_warning";

export interface DataIssue {
  qwasar_user_id: number | null;
  kind: DataIssueKind;
  detail: string;
  suggested_fix: string;
}

export interface ImportSummary {
  totalRows: number;
  activeRows: number;
  cohortRows: number;
  students: number;
  snapshotRows: number;
  modules: string[];
}
