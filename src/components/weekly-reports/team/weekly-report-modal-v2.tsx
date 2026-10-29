"use client";

import { Loader2, RotateCw, Save, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DraftRestoredChip } from "@/components/forms/draft-restored-chip";
import { DraftSaveState } from "@/components/forms/draft-save-state";
import { firstErrorKey } from "@/lib/weekly-report-form-errors";
import { ReportDialogShell } from "@/components/weekly-reports/shared/report-dialog-shell";
import {
  TEAM_QUESTION_ORDER,
  TeamReportQuestions,
  teamQuestionAnchor,
} from "@/components/weekly-reports/team/team-report-questions";
import { useTeamReportForm } from "@/components/weekly-reports/team/use-team-report-form";

interface WeeklyReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  userId: string;
  onSuccess?: () => void;
}

/**
 * Team weekly report, V2 look. The draft lives in this week's DB row (no
 * browser storage): each open refetches it and prefills, then edits
 * autosave silently. Questions, pickers and dialog shell are shared with
 * the solo form.
 */
export function WeeklyReportModal({
  open,
  onOpenChange,
  teamId,
  userId,
  onSuccess,
}: WeeklyReportModalProps) {
  const f = useTeamReportForm({
    open,
    teamId,
    userId,
    onClose: () => onOpenChange(false),
    onSuccess,
  });
  const busy =
    f.isSavingDraft || f.isSubmitting || f.isLoadingDraft || f.loadError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = f.trySubmit();
    const first = firstErrorKey(errors, TEAM_QUESTION_ORDER);
    if (first) {
      document
        .getElementById(teamQuestionAnchor(first))
        ?.scrollIntoView({ block: "center" });
    }
  };

  return (
    <ReportDialogShell
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : void f.close())}
      eyebrow="Team Journey"
      title="Weekly report"
      description="Eight questions about the week, for you and your team. Due Monday 10:00 Riga time."
      chip={
        f.restoredFromDb ? (
          <DraftRestoredChip savedAt={f.savedAt} className="shrink-0" />
        ) : undefined
      }
      formId="team-weekly-report-form"
      onSubmit={handleSubmit}
      footer={
        <>
          <div className="flex items-center gap-3">
            {f.hasContent && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={f.clearForm}
                disabled={busy}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            )}
            <DraftSaveState
              status={f.autosave.status}
              errorMessage={f.autosave.errorMessage}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => void f.close()}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={f.saveDraft}
              disabled={busy || !f.hasContent}
            >
              {f.isSavingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {f.isSavingDraft ? "Saving…" : "Save and close"}
            </Button>
            <Button
              type="submit"
              form="team-weekly-report-form"
              disabled={busy}
            >
              {f.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {f.isSubmitting ? "Submitting…" : "Submit report"}
            </Button>
          </div>
        </>
      }
    >
      {f.isLoadingDraft ? (
        <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking for a saved draft…
        </div>
      ) : f.loadError ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive flex flex-col items-start gap-3 rounded-md border p-4 text-sm"
        >
          Couldn&apos;t load your saved draft. Check your connection and reopen.
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={f.retryLoad}
          >
            <RotateCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      ) : (
        <TeamReportQuestions
          value={f.form}
          onChange={f.setForm}
          errors={f.errors}
          disabled={f.isSavingDraft || f.isSubmitting}
        />
      )}
    </ReportDialogShell>
  );
}
