"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatWeekPeriod } from "@/lib/weekly-reports";
import { IndividualReportQuestions } from "@/components/weekly-reports/individual/individual-report-questions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Solo (My Journey) weekly report. Drafts live in the DB row for the current
 * week (no localStorage): when the dialog opens with a saved draft, the form
 * is prefilled from it.
 */
export function IndividualWeeklyReportModal({ open, onOpenChange }: Props) {
  const { user } = useApp();
  const { data: status } = useIndividualWeeklyReportStatus(user?.id);
  const submit = useSubmitIndividualWeeklyReport(user?.id);
  const [form, setForm] = useState(emptyIndividualReportForm());
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Prefill ONLY when the dialog opens. Depending on `status.draft` here
  // would reset the form mid-typing whenever the status query refetches
  // (window focus), so the draft is read once per open on purpose.
  useEffect(() => {
    if (!open) return;
    if (status?.draft) {
      setForm(draftToForm(status.draft));
      setRestoredDraft(true);
    } else {
      setForm(emptyIndividualReportForm());
      setRestoredDraft(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hasContent = hasIndividualReportContent(form);
  const weekLabel = status ? formatWeekPeriod(status.week) : "";

  const close = () => {
    onOpenChange(false);
    setForm(emptyIndividualReportForm());
  };

  const handleSaveDraft = () => {
    const data = normalizeIndividualReport(form);
    submit.mutate(
      { data, asDraft: true },
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
      toast.error(parsed.error.issues[0].message);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Submit My Journey weekly report
            {restoredDraft && (
              <span className="text-muted-foreground bg-muted rounded px-2 py-0.5 text-xs font-normal">
                Draft restored
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {weekLabel
              ? `${weekLabel}. Deadline: Monday 10:00 Riga time.`
              : "Deadline: Monday 10:00 Riga time."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <IndividualReportQuestions value={form} onChange={setForm} />

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {hasContent && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setForm(emptyIndividualReportForm())}
                className="text-muted-foreground hover:text-destructive mr-auto"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Clear form
              </Button>
            )}
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={submit.isPending || !hasContent}
              className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              <Save className="mr-1 h-4 w-4" />
              {submit.isPending && submit.variables?.asDraft
                ? "Saving..."
                : "Save as Draft"}
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending && !submit.variables?.asDraft
                ? "Submitting..."
                : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
