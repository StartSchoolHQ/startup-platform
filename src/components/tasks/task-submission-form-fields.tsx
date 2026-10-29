"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FieldShell,
  FileListField,
  UrlListField,
  type ExternalUrl,
} from "@/components/tasks/submission-fields";

export interface FormField {
  name: string;
  type: "text" | "textarea" | "url_list" | "file";
  label: string;
  placeholder?: string;
  required?: boolean;
  multiple?: boolean;
  accept?: string;
}

export interface FormSchema {
  fields: FormField[];
}

export const DEFAULT_SCHEMA: FormSchema = {
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

/** One field of the task submission form. Renders props only. */
export function TaskSubmissionFormField({
  field,
  text,
  externalUrls,
  uploadedFiles,
  error,
  disabled,
  onText,
  onUrls,
  onFiles,
}: {
  field: FormField;
  text: string;
  externalUrls: ExternalUrl[];
  uploadedFiles: File[];
  error?: string;
  disabled: boolean;
  onText: (value: string) => void;
  onUrls: (urls: ExternalUrl[]) => void;
  onFiles: (files: File[]) => void;
}) {
  switch (field.type) {
    case "text":
    case "textarea":
      return (
        <FieldShell
          id={field.name}
          label={field.label}
          required={field.required}
          error={error}
        >
          {field.type === "text" ? (
            <Input
              id={field.name}
              placeholder={field.placeholder}
              value={text}
              onChange={(e) => onText(e.target.value)}
              disabled={disabled}
            />
          ) : (
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              value={text}
              onChange={(e) => onText(e.target.value)}
              className="min-h-[160px] resize-y"
              disabled={disabled}
            />
          )}
        </FieldShell>
      );
    case "url_list":
      return (
        <UrlListField
          label={field.label}
          placeholder={field.placeholder}
          required={field.required}
          urls={externalUrls}
          onChange={onUrls}
          error={error}
          disabled={disabled}
        />
      );
    case "file":
      return (
        <FileListField
          id={`file-${field.name}`}
          label={field.label}
          accept={field.accept}
          multiple={field.multiple}
          required={field.required}
          files={uploadedFiles}
          onChange={onFiles}
          error={error}
          disabled={disabled}
        />
      );
    default:
      return null;
  }
}
