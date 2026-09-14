import type {
  IndividualWeeklyReportData,
  IndividualWeeklyReportForm,
} from "@/types/weekly-report";

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
