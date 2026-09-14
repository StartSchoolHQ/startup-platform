import type { WeekBoundaries } from "@/lib/weekly-reports";

export type CommitmentStatus = "completed" | "in_progress" | "not_done";

export interface ReportCommitment {
  text: string;
  status: CommitmentStatus;
  explanation: string;
}

/** Exactly what `submit_individual_weekly_report_v1` stores in submission_data. */
export interface IndividualWeeklyReportData {
  commitments: ReportCommitment[];
  blockers: string;
  nextWeekCommitments: string[];
  alignmentScore: number | null;
  alignmentReason: string;
  submittedAt?: string;
}

/** Form state: same shape, score always set, blank rows allowed while typing. */
export interface IndividualWeeklyReportForm {
  commitments: ReportCommitment[];
  blockers: string;
  nextWeekCommitments: string[];
  alignmentScore: number;
  alignmentReason: string;
}

export interface IndividualWeeklyReportHistoryEntry {
  id: string;
  week_number: number;
  week_year: number;
  week_start_date: string;
  week_end_date: string;
  submitted_at: string | null;
  submission_data: IndividualWeeklyReportData | null;
}

/** Return shape of `get_individual_weekly_report_status_v1`. */
export interface IndividualWeeklyReportStatus {
  week: WeekBoundaries;
  submitted: boolean;
  submitted_at: string | null;
  draft: Partial<IndividualWeeklyReportData> | null;
  history: IndividualWeeklyReportHistoryEntry[];
}
