"use client";

import { Textarea } from "@/components/ui/textarea";
import { CommitmentsField } from "@/components/weekly-reports/shared/commitments-field";
import { NextWeekField } from "@/components/weekly-reports/shared/next-week-field";
import { ScorePicker } from "@/components/weekly-reports/shared/pickers";
import {
  QuestionList,
  QuestionShell,
} from "@/components/weekly-reports/shared/question-shell";
import type { FieldErrors } from "@/lib/weekly-report-form-errors";
import type { IndividualWeeklyReportForm } from "@/types/weekly-report";

/** Schema keys in question order, for "scroll to the first error". */
export const SOLO_QUESTION_ORDER = [
  "commitments",
  "blockers",
  "nextWeekCommitments",
  "alignmentScore",
  "alignmentReason",
] as const;

/** Element id of the question a schema key belongs to. */
export function soloQuestionAnchor(key: string): string {
  if (key === "alignmentScore" || key === "alignmentReason")
    return "q-solo-alignment";
  return `q-solo-${key}`;
}

interface Props {
  value: IndividualWeeklyReportForm;
  onChange: (next: IndividualWeeklyReportForm) => void;
  errors: FieldErrors;
  disabled?: boolean;
}

/**
 * The four solo questions: team questions #1, #2, #6 and #8, renumbered.
 * Controlled — the modal owns state, validation and submit.
 */
export function IndividualReportQuestions({
  value,
  onChange,
  errors,
  disabled,
}: Props) {
  const set = <K extends keyof IndividualWeeklyReportForm>(
    key: K,
    next: IndividualWeeklyReportForm[K]
  ) => onChange({ ...value, [key]: next });

  return (
    <QuestionList>
      <QuestionShell
        id={soloQuestionAnchor("commitments")}
        number={1}
        title="What were your top commitments this week?"
        hint="Mark how each one went. Explain only the ones that didn't fully land."
        error={errors.commitments}
      >
        <CommitmentsField
          idPrefix="solo"
          value={value.commitments}
          disabled={disabled}
          onChange={(next) => set("commitments", next)}
        />
      </QuestionShell>

      <QuestionShell
        id={soloQuestionAnchor("blockers")}
        number={2}
        title="What blockers or challenges did you face?"
        hint="What got in the way, and why."
        optional
        htmlFor="solo-blockers"
        error={errors.blockers}
      >
        <Textarea
          id="solo-blockers"
          value={value.blockers}
          disabled={disabled}
          onChange={(e) => set("blockers", e.target.value)}
          rows={3}
          className="resize-y"
        />
      </QuestionShell>

      <QuestionShell
        id={soloQuestionAnchor("nextWeekCommitments")}
        number={3}
        title="Commitments for next week"
        hint="What are you committing to get done?"
        error={errors.nextWeekCommitments}
      >
        <NextWeekField
          idPrefix="solo"
          value={value.nextWeekCommitments}
          disabled={disabled}
          onChange={(next) => set("nextWeekCommitments", next)}
        />
      </QuestionShell>

      <QuestionShell
        id={soloQuestionAnchor("alignmentScore")}
        number={4}
        title="On a scale of 1–10, how aligned and motivated do you feel?"
        htmlFor="solo-alignment-reason"
        error={errors.alignmentScore ?? errors.alignmentReason}
      >
        <ScorePicker
          value={value.alignmentScore}
          disabled={disabled}
          ariaLabel="Alignment and motivation score"
          onChange={(score) => set("alignmentScore", score)}
        />
        <Textarea
          id="solo-alignment-reason"
          placeholder="Why do you feel this way?"
          value={value.alignmentReason}
          disabled={disabled}
          onChange={(e) => set("alignmentReason", e.target.value)}
          rows={2}
          className="resize-y"
        />
      </QuestionShell>
    </QuestionList>
  );
}
