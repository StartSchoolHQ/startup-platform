"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { Loader2, Save, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  type FieldErrors,
} from "@/lib/weekly-report-form-errors";
import { formatWeekPeriod } from "@/lib/weekly-reports";
import type { IndividualWeeklyReportForm } from "@/types/weekly-report";
import {
  IndividualReportQuestions,
  SOLO_QUESTION_ORDER,
  soloQuestionAnchor,
} from "@/components/weekly-reports/individual/individual-report-questions";
import {
  HeaderChip,
  ReportDialogShell,
} from "@/components/weekly-reports/shared/report-dialog-shell";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Drop the error of every question whose value the student just changed. */
function withoutChanged(
  errors: FieldErrors,
  prev: IndividualWeeklyReportForm,
  next: IndividualWeeklyReportForm
): FieldErrors {
  const kept = { ...errors };
  for (const key of Object.keys(next) as (keyof IndividualWeeklyReportForm)[]) {
    if (prev[key] !== next[key]) delete kept[key];
  }
  return kept;
}

/**
 * Solo (My Journey) weekly report. Drafts live in the DB row for the current
 * week (no localStorage): when the dialog opens with a saved draft, the form
 * is prefilled from it. Validation shows inline under the failing question.
 */
export function IndividualWeeklyReportModal({ open, onOpenChange }: Props) {
  const { user } = useApp();
  const { data: status } = useIndividualWeeklyReportStatus(user?.id);
  const submit = useSubmitIndividualWeeklyReport(user?.id);
  const [form, setForm] = useState(emptyIndividualReportForm());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Prefill ONLY when the dialog opens — depending on `status.draft` would
  // reset the form mid-typing whenever the status query refetches.
  useEffect(() => {
    if (!open) return;
    setForm(
      status?.draft ? draftToForm(status.draft) : emptyIndividualReportForm()
    );
    setRestoredDraft(Boolean(status?.draft));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hasContent = hasIndividualReportContent(form);
  const weekLabel = status ? formatWeekPeriod(status.week) : null;

  const handleChange = (next: IndividualWeeklyReportForm) => {
    setErrors((prev) => withoutChanged(prev, form, next));
    setForm(next);
  };

  const close = () => {
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
          close();
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
            was_draft: restoredDraft,
          });
          close();
        },
      }
    );
  };

  const savingDraft = submit.isPending && submit.variables?.asDraft === true;
  const submitting = submit.isPending && submit.variables?.asDraft === false;

  return (
    <ReportDialogShell
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="My Journey"
      title="Weekly report"
      description={`${weekLabel ? `${weekLabel}. ` : ""}Four quick questions. Due Monday 10:00 Riga time.`}
      chip={restoredDraft ? <HeaderChip>Draft restored</HeaderChip> : undefined}
      formId="solo-weekly-report-form"
      onSubmit={handleSubmit}
      footer={
        <>
          <div>
            {hasContent && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setForm(emptyIndividualReportForm());
                  setErrors({});
                }}
                disabled={submit.isPending}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={submit.isPending || !hasContent}
            >
              {savingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {savingDraft ? "Saving…" : "Save draft"}
            </Button>
            <Button
              type="submit"
              form="solo-weekly-report-form"
              disabled={submit.isPending}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Submitting…" : "Submit report"}
            </Button>
          </div>
        </>
      }
    >
      <IndividualReportQuestions
        value={form}
        onChange={handleChange}
        errors={errors}
        disabled={submit.isPending}
      />
    </ReportDialogShell>
  );
}
