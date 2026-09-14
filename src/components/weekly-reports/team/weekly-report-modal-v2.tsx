"use client";

import { FileText, Loader2, Save, Send, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { firstErrorKey } from "@/lib/weekly-report-form-errors";
import {
  HeaderChip,
  ReportDialogShell,
} from "@/components/weekly-reports/shared/report-dialog-shell";
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
 * Team weekly report, V2 look. Same props and same data path as the V1
 * modal (`weekly-report-modal.tsx`, kept for rollback); the questions,
 * pickers and dialog shell are shared with the solo form.
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
  const busy = f.isSavingDraft || f.isSubmitting || f.isLoadingDraft;

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
    <>
      <AlertDialog
        open={f.pendingLocalDraft !== null}
        onOpenChange={(o) => !o && f.discardLocalDraft()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="text-primary h-5 w-5" />
              Pick up where you left off?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved answers from an earlier session on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={f.discardLocalDraft}>
              Start fresh
            </AlertDialogCancel>
            <AlertDialogAction onClick={f.restoreLocalDraft}>
              Continue editing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportDialogShell
        open={open}
        onOpenChange={onOpenChange}
        eyebrow="Team Journey"
        title="Weekly report"
        description="Eight questions about the week, for you and your team. Due Monday 10:00 Riga time."
        chip={
          f.restoredFromDb ? <HeaderChip>Draft restored</HeaderChip> : undefined
        }
        formId="team-weekly-report-form"
        onSubmit={handleSubmit}
        footer={
          <>
            <div>
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
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
                {f.isSavingDraft ? "Saving…" : "Save draft"}
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
        ) : (
          <TeamReportQuestions
            value={f.form}
            onChange={f.setForm}
            errors={f.errors}
            disabled={f.isSavingDraft || f.isSubmitting}
          />
        )}
      </ReportDialogShell>
    </>
  );
}
