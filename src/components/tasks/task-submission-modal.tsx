"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DraftSaveState } from "@/components/forms/draft-save-state";
import type { ExternalUrl } from "@/components/tasks/submission-fields";
import {
  DEFAULT_SCHEMA,
  TaskSubmissionFormField,
  type FormSchema,
} from "@/components/tasks/task-submission-form-fields";
import { TaskSubmissionDraftChip } from "@/components/tasks/task-submission-draft-chip";
import { useTaskSubmissionDraft } from "@/components/tasks/use-task-submission-draft";
import { pickTaskSeed } from "@/lib/task-draft-precedence";

export type { ExternalUrl } from "@/components/tasks/submission-fields";

interface SubmissionData {
  description?: string;
  external_urls: ExternalUrl[];
  files: File[];
  submitted_at: string;
  [key: string]: unknown;
}

/**
 * Values the form opens with — used to prefill a resubmission with what was
 * submitted last time. Files can never be prefilled (a File object cannot be
 * rebuilt from a stored URL), so only the description and links carry over.
 */
export interface TaskSubmissionInitialData {
  description?: string;
  external_urls?: ExternalUrl[];
}

interface TaskSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (submissionData: SubmissionData) => Promise<void>;
  taskTitle: string;
  formSchema?: FormSchema;
  isLoading?: boolean;
  isIndividualTask?: boolean;
  initialData?: TaskSubmissionInitialData;
  /** Enables draft restore + autosave when set. */
  progressId?: string | null;
  /** Last submission time; a draft older than this loses to `initialData`. */
  submittedAt?: string | null;
}

export function TaskSubmissionModal({
  isOpen,
  onClose,
  onSubmit,
  taskTitle,
  formSchema,
  isLoading = false,
  isIndividualTask = false,
  initialData,
  progressId = null,
  submittedAt = null,
}: TaskSubmissionModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [externalUrls, setExternalUrls] = useState<ExternalUrl[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const description =
    typeof formData.description === "string" ? formData.description : "";
  const draftValue = useMemo(
    () => ({ description, external_urls: externalUrls }),
    [description, externalUrls]
  );
  const { loading, draft, autosave } = useTaskSubmissionDraft({
    open: isOpen,
    progressId,
    value: draftValue,
    canSave: !!description.trim() || externalUrls.length > 0,
  });

  // Seed once per open, after that open's draft fetch settled, then leave the
  // form alone (a fresh `initialData` literal per render must not wipe what
  // the student types). Adjust-state-during-render, not an effect.
  const [openState, setOpenState] = useState({ open: false, count: 0 });
  if (isOpen !== openState.open) {
    setOpenState({
      open: isOpen,
      count: isOpen ? openState.count + 1 : openState.count,
    });
  }
  const [seededFor, setSeededFor] = useState(0);
  const [restored, setRestored] = useState<{ open: number; at: string }>();
  if (isOpen && !loading && seededFor !== openState.count) {
    setSeededFor(openState.count);
    const { seed, restoredFromDraft } = pickTaskSeed({
      draft,
      rejected: initialData,
      submittedAt,
    });
    setFormData(seed?.description ? { description: seed.description } : {});
    setExternalUrls(seed?.external_urls ?? []);
    setUploadedFiles([]);
    setErrors({});
    setRestored(
      restoredFromDraft && draft
        ? { open: openState.count, at: draft.updated_at }
        : undefined
    );
  }
  const restoredOpen = restored?.open;
  useEffect(() => {
    if (restoredOpen === undefined || !progressId) return;
    posthog.capture("task_draft_restored", { progress_id: progressId });
  }, [restoredOpen, progressId]);

  const schema = formSchema?.fields?.length ? formSchema : DEFAULT_SCHEMA;
  const isResubmission = !!initialData?.description;
  const busy = isLoading || loading;

  const clearError = (name: string) => {
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleClose = async () => {
    await autosave.flush();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const field of schema.fields) {
      if (!field.required) continue;
      const missing =
        field.type === "url_list"
          ? externalUrls.length === 0
          : field.type === "file"
            ? uploadedFiles.length === 0
            : !String(formData[field.name] ?? "").trim();
      if (missing) {
        next[field.name] =
          field.type === "url_list"
            ? "Add at least one link."
            : field.type === "file"
              ? "Attach at least one file."
              : "This can't be empty.";
      }
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    autosave.cancel();
    await onSubmit({
      ...formData,
      external_urls: externalUrls,
      files: uploadedFiles,
      submitted_at: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="space-y-1.5 px-6 pt-6 pb-5 text-left">
          <p className="text-primary text-xs font-medium">
            {isResubmission ? "Resubmit task" : "Submit task"}
          </p>
          <DialogTitle className="pr-6 text-xl leading-snug font-semibold tracking-tight">
            {taskTitle}
          </DialogTitle>
          {!loading && restored?.open === openState.count && (
            <TaskSubmissionDraftChip savedAt={restored.at} />
          )}
          <DialogDescription className="text-sm">
            {isIndividualTask
              ? "Goes straight to review. You'll see the result on this page and get a notification."
              : "Goes to peer reviewers, who usually reply within 2–3 days. You'll be notified when it's done."}
            {isResubmission &&
              " Your previous answer is prefilled — edit it, then send again. Files need re-attaching."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="task-submission-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto border-t px-6 py-5"
        >
          {loading ? (
            <p className="text-muted-foreground text-sm">
              Checking for a saved draft…
            </p>
          ) : (
            schema.fields.map((field) => (
              <TaskSubmissionFormField
                key={field.name}
                field={field}
                text={(formData[field.name] as string) || ""}
                externalUrls={externalUrls}
                uploadedFiles={uploadedFiles}
                error={errors[field.name]}
                disabled={busy}
                onText={(value) => {
                  setFormData((prev) => ({ ...prev, [field.name]: value }));
                  clearError(field.name);
                }}
                onUrls={(urls) => {
                  setExternalUrls(urls);
                  clearError(field.name);
                }}
                onFiles={(files) => {
                  setUploadedFiles(files);
                  clearError(field.name);
                }}
              />
            ))
          )}
        </form>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:gap-2">
          <DraftSaveState
            status={autosave.status}
            errorMessage={autosave.errorMessage}
            className="self-center sm:mr-auto"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" form="task-submission-form" disabled={busy}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isLoading
              ? "Sending…"
              : isIndividualTask
                ? "Send for review"
                : "Send to peer review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
