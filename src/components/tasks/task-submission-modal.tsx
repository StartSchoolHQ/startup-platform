"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FieldShell,
  FileListField,
  UrlListField,
  type ExternalUrl,
} from "@/components/tasks/submission-fields";

export type { ExternalUrl } from "@/components/tasks/submission-fields";

interface FormField {
  name: string;
  type: "text" | "textarea" | "url_list" | "file";
  label: string;
  placeholder?: string;
  required?: boolean;
  multiple?: boolean;
  accept?: string;
}

interface FormSchema {
  fields: FormField[];
}

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
}

const DEFAULT_SCHEMA: FormSchema = {
  fields: [
    {
      name: "description",
      type: "textarea",
      label: "What did you do?",
      required: true,
      placeholder:
        "Write the actual result here — the pitch, the answers, the reflection. Not a summary of the task.",
    },
    {
      name: "external_urls",
      type: "url_list",
      label: "Links",
      placeholder: "https://docs.google.com/…",
      required: false,
    },
    {
      name: "screenshots",
      type: "file",
      label: "Files",
      accept: "image/*,.pdf,.docx,.txt",
      required: false,
      multiple: true,
    },
  ],
};

export function TaskSubmissionModal({
  isOpen,
  onClose,
  onSubmit,
  taskTitle,
  formSchema,
  isLoading = false,
  isIndividualTask = false,
  initialData,
}: TaskSubmissionModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [externalUrls, setExternalUrls] = useState<ExternalUrl[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Seed the form each time the modal opens, then leave it alone — keyed on
  // `isOpen` only, so a caller passing a fresh object literal on every render
  // cannot re-seed (and wipe) what the student is typing.
  useEffect(() => {
    if (!isOpen) return;
    setFormData(
      initialData?.description ? { description: initialData.description } : {}
    );
    setExternalUrls(initialData?.external_urls ?? []);
    setUploadedFiles([]);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const schema = formSchema?.fields?.length ? formSchema : DEFAULT_SCHEMA;
  const isResubmission = !!initialData?.description;

  const setValue = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
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
    await onSubmit({
      ...formData,
      external_urls: externalUrls,
      files: uploadedFiles,
      submitted_at: new Date().toISOString(),
    });
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case "text":
        return (
          <FieldShell
            key={field.name}
            id={field.name}
            label={field.label}
            required={field.required}
            error={errors[field.name]}
          >
            <Input
              id={field.name}
              placeholder={field.placeholder}
              value={(formData[field.name] as string) || ""}
              onChange={(e) => setValue(field.name, e.target.value)}
              disabled={isLoading}
            />
          </FieldShell>
        );
      case "textarea":
        return (
          <FieldShell
            key={field.name}
            id={field.name}
            label={field.label}
            required={field.required}
            error={errors[field.name]}
          >
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              value={(formData[field.name] as string) || ""}
              onChange={(e) => setValue(field.name, e.target.value)}
              className="min-h-[160px] resize-y"
              disabled={isLoading}
            />
          </FieldShell>
        );
      case "url_list":
        return (
          <UrlListField
            key={field.name}
            label={field.label}
            placeholder={field.placeholder}
            required={field.required}
            urls={externalUrls}
            onChange={(urls) => {
              setExternalUrls(urls);
              if (errors[field.name])
                setErrors((prev) => ({ ...prev, [field.name]: "" }));
            }}
            error={errors[field.name]}
            disabled={isLoading}
          />
        );
      case "file":
        return (
          <FileListField
            key={field.name}
            id={`file-${field.name}`}
            label={field.label}
            accept={field.accept}
            multiple={field.multiple}
            required={field.required}
            files={uploadedFiles}
            onChange={(files) => {
              setUploadedFiles(files);
              if (errors[field.name])
                setErrors((prev) => ({ ...prev, [field.name]: "" }));
            }}
            error={errors[field.name]}
            disabled={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="space-y-1.5 px-6 pt-6 pb-5 text-left">
          <p className="text-primary text-xs font-medium">
            {isResubmission ? "Resubmit task" : "Submit task"}
          </p>
          <DialogTitle className="pr-6 text-xl leading-snug font-semibold tracking-tight">
            {taskTitle}
          </DialogTitle>
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
          {schema.fields.map(renderField)}
        </form>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="task-submission-form"
            disabled={isLoading}
          >
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
