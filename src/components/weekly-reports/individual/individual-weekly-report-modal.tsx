"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { useApp } from "@/contexts/app-context";
import {
  useIndividualWeeklyReportStatus,
  useSubmitIndividualWeeklyReport,
} from "@/hooks/use-individual-weekly-report";
import {
  draftToForm,
  emptyIndividualReportForm,
  hasIndividualReportContent,
  normalizeIndividualReport,
} from "@/lib/individual-weekly-report";
import { IndividualWeeklyReportSchema } from "@/lib/validation-schemas";
import {
  fieldErrorsFromIssues,
  firstErrorKey,
  withoutChanged,
  type FieldErrors,
} from "@/lib/weekly-report-form-errors";
import { formatWeekPeriod } from "@/lib/weekly-reports";
import type { IndividualWeeklyReportForm } from "@/types/weekly-report";
import {
  IndividualReportQuestions,
  SOLO_QUESTION_ORDER,
  soloQuestionAnchor,
} from "@/components/weekly-reports/individual/individual-report-questions";
import { IndividualReportFooter } from "@/components/weekly-reports/individual/individual-report-footer";
import { useIndividualReportDraft } from "@/components/weekly-reports/individual/use-individual-report-draft";
import { ReportDialogShell } from "@/components/weekly-reports/shared/report-dialog-shell";
import { DraftRestoredChip } from "@/components/forms/draft-restored-chip";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Solo (My Journey) weekly report. Drafts live in the DB row for the current
 * week (no localStorage): each open refetches the draft and prefills from it,
 * then edits autosave silently. Validation shows inline under the question.
 */
export function IndividualWeeklyReportModal({ open, onOpenChange }: Props) {
  const { user } = useApp();
  const { data: status } = useIndividualWeeklyReportStatus(user?.id);
  const submit = useSubmitIndividualWeeklyReport(user?.id);
  const [form, setForm] = useState(emptyIndividualReportForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { loading, draft, savedAt, autosave } = useIndividualReportDraft({
    open,
    userId: user?.id,
    form,
  });

  // Seed once per open, after that open's refetch settled, then leave the
  // form alone. Adjust-state-during-render, not an effect.
  const [openState, setOpenState] = useState({ open: false, count: 0 });
  if (open !== openState.open) {
    setOpenState({
      open,
      count: open ? openState.count + 1 : openState.count,
    });
  }
  const [seededFor, setSeededFor] = useState(0);
  const [restored, setRestored] = useState<{ open: number; at: Date | null }>();
  if (open && !loading && seededFor !== openState.count) {
    setSeededFor(openState.count);
    const seed = draft ? draftToForm(draft) : emptyIndividualReportForm();
    setForm(seed);
    setErrors({});
    // An empty restored draft (e.g. after Clear) gets no chip and no event.
    setRestored(
      draft && hasIndividualReportContent(seed)
        ? { open: openState.count, at: savedAt }
        : undefined
    );
  }
  const restoredOpen = restored?.open;
  useEffect(() => {
    if (restoredOpen === undefined) return;
    posthog.capture("weekly_report_draft_restored", { context: "individual" });
  }, [restoredOpen]);
  const restoredNow = !loading && restored?.open === openState.count;

  const hasContent = hasIndividualReportContent(form);
  const weekLabel = status ? formatWeekPeriod(status.week) : null;

  const handleChange = (next: IndividualWeeklyReportForm) => {
    setErrors((prev) => withoutChanged(prev, form, next));
    setForm(next);
  };

  // Save what is on screen before the form is reset and the dialog closes.
  const close = async () => {
    await autosave.flush();
    onOpenChange(false);
    setForm(emptyIndividualReportForm());
    setErrors({});
  };

  const handleSaveDraft = () => {
    submit.mutate(
      { data: normalizeIndividualReport(form), asDraft: true },
      {
        onSuccess: (result) => {
          posthog.capture("individual_weekly_report_draft_saved", {
            week_number: result.week_number,
            week_year: result.week_year,
          });
          void close();
        },
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = normalizeIndividualReport(form);
    const parsed = IndividualWeeklyReportSchema.safeParse(data);
    if (!parsed.success) {
      const next = fieldErrorsFromIssues(parsed.error.issues);
      setErrors(next);
      const first = firstErrorKey(next, SOLO_QUESTION_ORDER);
      if (first) {
        document
          .getElementById(soloQuestionAnchor(first))
          ?.scrollIntoView({ block: "center" });
      }
      return;
    }
    autosave.cancel();
    submit.mutate(
      { data, asDraft: false },
      {
        onSuccess: (result) => {
          posthog.capture("individual_weekly_report_submitted", {
            week_number: result.week_number,
            week_year: result.week_year,
            commitments_count: data.commitments.length,
            commitments_completed: data.commitments.filter(
              (c) => c.status === "completed"
            ).length,
            has_blockers: data.blockers.length > 0,
            alignment_score: data.alignmentScore,
            next_week_commitments_count: data.nextWeekCommitments.length,
            was_draft: restoredNow,
          });
          void close();
        },
      }
    );
  };

  const savingDraft = submit.isPending && submit.variables?.asDraft === true;
  const submitting = submit.isPending && submit.variables?.asDraft === false;

  return (
    <ReportDialogShell
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : void close())}
      eyebrow="My Journey"
      title="Weekly report"
      description={`${weekLabel ? `${weekLabel}. ` : ""}Four quick questions. Due Monday 12:00 Riga time.`}
      chip={
        restoredNow ? (
          <DraftRestoredChip savedAt={restored?.at} className="shrink-0" />
        ) : undefined
      }
      formId="solo-weekly-report-form"
      onSubmit={handleSubmit}
      footer={
        <IndividualReportFooter
          formId="solo-weekly-report-form"
          hasContent={hasContent}
          busy={loading || submit.isPending}
          savingDraft={savingDraft}
          submitting={submitting}
          autosaveStatus={autosave.status}
          autosaveError={autosave.errorMessage}
          onClear={() => {
            setForm(emptyIndividualReportForm());
            setErrors({});
          }}
          onCancel={() => void close()}
          onSaveAndClose={handleSaveDraft}
        />
      }
    >
      {loading ? (
        <p className="text-muted-foreground text-sm">
          Checking for a saved draft…
        </p>
      ) : (
        <IndividualReportQuestions
          value={form}
          onChange={handleChange}
          errors={errors}
          disabled={submit.isPending}
        />
      )}
    </ReportDialogShell>
  );
}
