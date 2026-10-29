import { Loader2, Save, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DraftSaveState } from "@/components/forms/draft-save-state";
import type { DraftSaveStatus } from "@/hooks/use-autosave-draft";

interface Props {
  formId: string;
  hasContent: boolean;
  /** Restore read running or failed, or a submit/save is pending. */
  busy: boolean;
  savingDraft: boolean;
  submitting: boolean;
  autosaveStatus: DraftSaveStatus;
  autosaveError: string | null;
  onClear: () => void;
  onCancel: () => void;
  onSaveAndClose: () => void;
}

/** Solo report footer: Clear + autosave state left, actions right. */
export function IndividualReportFooter({
  formId,
  hasContent,
  busy,
  savingDraft,
  submitting,
  autosaveStatus,
  autosaveError,
  onClear,
  onCancel,
  onSaveAndClose,
}: Props) {
  return (
    <>
      <div className="flex items-center gap-3">
        {hasContent && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={busy}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        )}
        <DraftSaveState status={autosaveStatus} errorMessage={autosaveError} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSaveAndClose}
          disabled={busy || !hasContent}
        >
          {savingDraft ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {savingDraft ? "Saving…" : "Save and close"}
        </Button>
        <Button type="submit" form={formId} disabled={busy}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Submitting…" : "Submit report"}
        </Button>
      </div>
    </>
  );
}
