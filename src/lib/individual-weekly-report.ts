import type {
  IndividualWeeklyReportData,
  IndividualWeeklyReportForm,
  IndividualWeeklyReportStatus,
  ReportCommitment,
} from "@/types/weekly-report";
import { DRAFT_SAVE_FALLBACK } from "@/lib/drafts/save-error";

export function emptyIndividualReportForm(): IndividualWeeklyReportForm {
  return {
    commitments: [{ text: "", status: "completed", explanation: "" }],
    blockers: "",
    nextWeekCommitments: [""],
    alignmentScore: 5,
    alignmentReason: "",
  };
}

/** Restores a saved draft into form state, padding to one row per list. */
export function draftToForm(
  draft: Partial<IndividualWeeklyReportData>
): IndividualWeeklyReportForm {
  const base = emptyIndividualReportForm();
  const commitments = (draft.commitments ?? []).map((c) => ({
    text: c.text ?? "",
    status: c.status ?? "completed",
    explanation: c.explanation ?? "",
  }));
  const next = (draft.nextWeekCommitments ?? []).filter(
    (c) => typeof c === "string"
  );
  return {
    commitments: commitments.length ? commitments : base.commitments,
    blockers: draft.blockers ?? "",
    nextWeekCommitments: next.length ? next : base.nextWeekCommitments,
    alignmentScore:
      typeof draft.alignmentScore === "number"
        ? draft.alignmentScore
        : base.alignmentScore,
    alignmentReason: draft.alignmentReason ?? "",
  };
}

/**
 * Question 1 rows seeded from question 3 ("commitments for the upcoming
 * week") of the newest submitted report older than the week being reported.
 * Empty when there is no such report. Rows start as "in progress" and stay
 * fully editable.
 */
export function prefillCommitmentsFromHistory(
  status: Pick<IndividualWeeklyReportStatus, "week" | "history">
): ReportCommitment[] {
  const { week_year: year, week_number: week } = status.week;
  // History is newest first.
  const previous = status.history.find(
    (h) => h.week_year < year || (h.week_year === year && h.week_number < week)
  );
  const lines = previous?.submission_data?.nextWeekCommitments ?? [];
  return lines
    .filter((line): line is string => typeof line === "string")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((text) => ({ text, status: "in_progress", explanation: "" }));
}

/** Trims text and drops blank rows — what we validate and what we send. */
export function normalizeIndividualReport(
  form: IndividualWeeklyReportForm
): IndividualWeeklyReportData {
  return {
    commitments: form.commitments
      .map((c) => ({
        text: c.text.trim(),
        status: c.status,
        explanation: c.explanation.trim(),
      }))
      .filter((c) => c.text.length > 0),
    blockers: form.blockers.trim(),
    nextWeekCommitments: form.nextWeekCommitments
      .map((c) => c.trim())
      .filter((c) => c.length > 0),
    alignmentScore: form.alignmentScore,
    alignmentReason: form.alignmentReason.trim(),
  };
}

export function hasIndividualReportContent(
  form: IndividualWeeklyReportForm
): boolean {
  return (
    form.commitments.some((c) => c.text.trim()) ||
    form.blockers.trim().length > 0 ||
    form.nextWeekCommitments.some((c) => c.trim()) ||
    form.alignmentReason.trim().length > 0
  );
}

/** WHAT failed + WHY + HOW to fix, for the two stable RPC codes. */
export function mapIndividualReportRpcError(message: string): string {
  if (message.includes("ALREADY_SUBMITTED")) {
    return "This week's report is already submitted — one report per week. Open Past reports to read it.";
  }
  if (message.includes("MY_JOURNEY_DISABLED")) {
    return "Weekly reports are closed because My Journey is switched off. Try again once the programme phase is on.";
  }
  return message;
}

/**
 * Short form for the autosave indicator (no toast, one line in the footer).
 * Known codes get their own line; network and PostgREST errors the generic
 * one (the raw text goes to the console).
 */
export function mapIndividualDraftAutosaveError(message: string): string {
  if (message.includes("ALREADY_SUBMITTED")) {
    return "This week's report was already submitted.";
  }
  if (message.includes("MY_JOURNEY_DISABLED")) {
    return mapIndividualReportRpcError(message);
  }
  console.error("Solo report draft autosave failed:", message);
  return DRAFT_SAVE_FALLBACK;
}
