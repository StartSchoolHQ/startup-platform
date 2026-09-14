"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CommitmentsField } from "@/components/weekly-reports/shared/commitments-field";
import { NextWeekField } from "@/components/weekly-reports/shared/next-week-field";
import { ScorePicker } from "@/components/weekly-reports/shared/pickers";
import {
  QuestionList,
  QuestionShell,
} from "@/components/weekly-reports/shared/question-shell";
import type { FieldErrors } from "@/lib/weekly-report-form-errors";
import type { TeamWeeklyReportForm } from "@/types/weekly-report";

/** Schema keys in question order, for "scroll to the first error". */
export const TEAM_QUESTION_ORDER = [
  "commitments",
  "blockers",
  "meetingsHeld",
  "keyInsight",
  "mostImportantOutcome",
  "measurableProgress",
  "biggestAchievement",
  "achievementImpact",
  "nextWeekCommitments",
  "teamRecognition",
  "alignmentScore",
  "alignmentReason",
] as const;

const ANCHOR: Record<string, string> = {
  meetingsHeld: "q-team-meetings",
  keyInsight: "q-team-meetings",
  mostImportantOutcome: "q-team-meetings",
  biggestAchievement: "q-team-achievement",
  achievementImpact: "q-team-achievement",
  alignmentScore: "q-team-alignment",
  alignmentReason: "q-team-alignment",
};

export function teamQuestionAnchor(key: string): string {
  return ANCHOR[key] ?? `q-team-${key}`;
}

interface Props {
  value: TeamWeeklyReportForm;
  onChange: (next: TeamWeeklyReportForm) => void;
  errors: FieldErrors;
  disabled?: boolean;
}

/** The eight team questions, same wording as the V1 modal. Controlled. */
export function TeamReportQuestions({
  value,
  onChange,
  errors,
  disabled,
}: Props) {
  const set = <K extends keyof TeamWeeklyReportForm>(
    key: K,
    next: TeamWeeklyReportForm[K]
  ) => onChange({ ...value, [key]: next });

  const area = (
    key: keyof TeamWeeklyReportForm & string,
    placeholder: string,
    rows = 2
  ) => (
    <Textarea
      id={`team-${key}`}
      placeholder={placeholder}
      value={value[key] as string}
      disabled={disabled}
      onChange={(e) => set(key, e.target.value as never)}
      rows={rows}
      className="resize-y"
    />
  );

  return (
    <QuestionList>
      <QuestionShell
        id={teamQuestionAnchor("commitments")}
        number={1}
        title="What were your top commitments this week?"
        hint="Mark how each one went. Explain only the ones that didn't fully land."
        error={errors.commitments}
      >
        <CommitmentsField
          idPrefix="team"
          value={value.commitments}
          disabled={disabled}
          onChange={(next) => set("commitments", next)}
        />
      </QuestionShell>

      <QuestionShell
        id={teamQuestionAnchor("blockers")}
        number={2}
        title="What blockers or challenges did you face?"
        hint="What happened and why it happened."
        optional
        htmlFor="team-blockers"
        error={errors.blockers}
      >
        {area("blockers", "", 3)}
      </QuestionShell>

      <QuestionShell
        id={teamQuestionAnchor("meetingsHeld")}
        number={3}
        title="What user or customer interactions did you have this week?"
        htmlFor="team-meetingsHeld"
        error={
          errors.meetingsHeld ??
          errors.keyInsight ??
          errors.mostImportantOutcome
        }
      >
        <div className="flex items-center gap-3">
          <Input
            id="team-meetingsHeld"
            inputMode="numeric"
            placeholder="0"
            value={value.meetingsHeld || ""}
            disabled={disabled}
            onChange={(e) =>
              set(
                "meetingsHeld",
                parseInt(e.target.value.replace(/\D/g, ""), 10) || 0
              )
            }
            className="w-24 tabular-nums"
          />
          <Label htmlFor="team-meetingsHeld" className="text-muted-foreground">
            meetings or conversations
          </Label>
        </div>
        {value.meetingsHeld > 0 && (
          <div className="space-y-2">
            {area("keyInsight", "Key insight from those conversations")}
            {area("mostImportantOutcome", "Most important outcome")}
          </div>
        )}
      </QuestionShell>

      <QuestionShell
        id={teamQuestionAnchor("measurableProgress")}
        number={4}
        title="What measurable progress did you make toward traction or product improvements?"
        hint="Data, not opinions: users onboarded, signups, conversions, prototype tested."
        htmlFor="team-measurableProgress"
        error={errors.measurableProgress}
      >
        {area("measurableProgress", "", 3)}
      </QuestionShell>

      <QuestionShell
        id={teamQuestionAnchor("biggestAchievement")}
        number={5}
        title="What was your most important achievement this week?"
        htmlFor="team-biggestAchievement"
        error={errors.biggestAchievement ?? errors.achievementImpact}
      >
        {area("biggestAchievement", "The accomplishment itself")}
        {area(
          "achievementImpact",
          "Why it matters: impact on validation, product or revenue"
        )}
      </QuestionShell>

      <QuestionShell
        id={teamQuestionAnchor("nextWeekCommitments")}
        number={6}
        title="Commitments for next week"
        hint="What are you committing to get done?"
        error={errors.nextWeekCommitments}
      >
        <NextWeekField
          idPrefix="team"
          value={value.nextWeekCommitments}
          disabled={disabled}
          onChange={(next) => set("nextWeekCommitments", next)}
        />
      </QuestionShell>

      <QuestionShell
        id={teamQuestionAnchor("teamRecognition")}
        number={7}
        title="Who from the team deserves recognition this week?"
        optional
        htmlFor="team-teamRecognition"
        error={errors.teamRecognition}
      >
        {area("teamRecognition", "Name them and what they did")}
      </QuestionShell>

      <QuestionShell
        id={teamQuestionAnchor("alignmentScore")}
        number={8}
        title="On a scale of 1–10, how aligned and motivated do you feel?"
        htmlFor="team-alignmentReason"
        error={errors.alignmentScore ?? errors.alignmentReason}
      >
        <ScorePicker
          value={value.alignmentScore}
          disabled={disabled}
          ariaLabel="Alignment and motivation score"
          onChange={(score) => set("alignmentScore", score)}
        />
        {area("alignmentReason", "Why do you feel this way?")}
      </QuestionShell>
    </QuestionList>
  );
}
