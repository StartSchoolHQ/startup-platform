import type { TeamWeeklyReportForm } from "@/types/weekly-report";

/** Pure helpers for the team (8-question) weekly report form. */

export function emptyTeamReportForm(): TeamWeeklyReportForm {
  return {
    commitments: [{ text: "", status: "completed", explanation: "" }],
    blockers: "",
    meetingsHeld: 0,
    keyInsight: "",
    mostImportantOutcome: "",
    measurableProgress: "",
    biggestAchievement: "",
    achievementImpact: "",
    nextWeekCommitments: [""],
    teamRecognition: "",
    alignmentScore: 5,
    alignmentReason: "",
  };
}

/** Same "has the student typed anything" test the V1 modal used. */
export function hasTeamReportContent(f: TeamWeeklyReportForm): boolean {
  return (
    f.commitments.some((c) => c.text.trim()) ||
    f.blockers.trim().length > 0 ||
    f.biggestAchievement.trim().length > 0 ||
    f.nextWeekCommitments.some((c) => c.trim())
  );
}

/** Drops blank list rows the way V1 did before saving or validating. */
export function normalizeTeamReport(f: TeamWeeklyReportForm) {
  return {
    ...f,
    commitments: f.commitments.filter((c) => c.text.trim().length > 0),
    nextWeekCommitments: f.nextWeekCommitments.filter((c) => c.trim()),
  };
}

/** Restores a saved draft (DB or localStorage) into form state. */
export function teamDraftToForm(
  saved: Partial<TeamWeeklyReportForm>
): TeamWeeklyReportForm {
  const base = emptyTeamReportForm();
  const commitments = (saved.commitments ?? []).map((c) => ({
    text: c.text ?? "",
    status: c.status ?? "completed",
    explanation: c.explanation ?? "",
  }));
  const next = (saved.nextWeekCommitments ?? []).filter(Boolean);
  return {
    ...base,
    ...saved,
    commitments: commitments.length ? commitments : base.commitments,
    nextWeekCommitments: next.length ? next : base.nextWeekCommitments,
    meetingsHeld: saved.meetingsHeld ?? 0,
    alignmentScore: saved.alignmentScore ?? 5,
  };
}
