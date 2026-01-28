"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Link, FileText } from "lucide-react";

interface ExternalUrl {
  url: string;
  title: string;
  type: string;
}

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

interface TaskSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (submissionData: SubmissionData) => Promise<void>;
  taskTitle: string;
  formSchema?: FormSchema;
  isLoading?: boolean;
  isIndividualTask?: boolean;
}

export function TaskSubmissionModal({
  isOpen,
  onClose,
  onSubmit,
  taskTitle,
  formSchema,
  isLoading = false,
  isIndividualTask = false,
}: TaskSubmissionModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [externalUrls, setExternalUrls] = useState<ExternalUrl[]>([]);
  const [currentUrl, setCurrentUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Default form schema if none provided
  const defaultSchema: FormSchema = {
    fields: [
      {
        name: "description",
        type: "textarea",
        label: "Describe what you accomplished",
        required: true,
        placeholder:
          "Explain how you completed this task and what deliverables you've created...",
      },
      {
        name: "external_urls",
        type: "url_list",
        label: "Public resources (Google Sheets, GitHub, demos, etc.)",
        placeholder: "https://docs.google.com/spreadsheets/...",
        required: false,
      },
      {
        name: "screenshots",
        type: "file",
        label: "Upload screenshots or documents",
        accept: "image/*,.pdf,.docx,.txt",
        required: false,
        multiple: true,
      },
    ],
  };

  // Ensure we have a valid schema with fields array
  const schema = formSchema?.fields?.length ? formSchema : defaultSchema;

  const detectUrlType = (url: string): string => {
    if (url.includes("docs.google.com/spreadsheets")) return "google_sheets";
    if (url.includes("docs.google.com/document")) return "google_docs";
    if (url.includes("github.com")) return "github";
    if (url.includes("figma.com")) return "figma";
    if (url.includes("notion.so")) return "notion";
    return "external";
  };

  const addExternalUrl = () => {
    if (!currentUrl.trim()) return;

    try {
      new URL(currentUrl); // Validate URL
      const urlType = detectUrlType(currentUrl);
      const title = currentUrl.split("/").pop() || "External Resource";

      setExternalUrls([
        ...externalUrls,
        {
          url: currentUrl,
          title,
          type: urlType,
        },
      ]);
      setCurrentUrl("");
      setUrlError(null);
    } catch {
      setUrlError("Please enter a valid URL");
    }
  };

  const removeExternalUrl = (index: number) => {
    setExternalUrls(externalUrls.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const errors: string[] = [];
    (schema?.fields || []).forEach((field) => {
      if (field.required) {
        if (field.name === "external_urls" && externalUrls.length === 0) {
          errors.push(`${field.label} is required`);
        } else if (field.name === "screenshots" && uploadedFiles.length === 0) {
          errors.push(`${field.label} is required`);
        } else if (
          !formData[field.name] &&
          field.type !== "url_list" &&
          field.type !== "file"
        ) {
          errors.push(`${field.label} is required`);
        }
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);

    // Prepare submission data
    const submissionData = {
      ...formData,
      external_urls: externalUrls,
      files: uploadedFiles, // Will be processed for upload
      submitted_at: new Date().toISOString(),
    };

    await onSubmit(submissionData);
  };

  const renderField = (field: FormField) => {
    switch (field.type) {
      case "text":
        return (
          <div key={field.name}>
            <Label htmlFor={field.name}>
              {field.label}{" "}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              placeholder={field.placeholder}
              value={(formData[field.name] as string) || ""}
              onChange={(e) =>
                setFormData({ ...formData, [field.name]: e.target.value })
              }
              required={field.required}
            />
          </div>
        );

      case "textarea":
        return (
          <div key={field.name}>
            <Label htmlFor={field.name}>
              {field.label}{" "}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              value={(formData[field.name] as string) || ""}
              onChange={(e) =>
                setFormData({ ...formData, [field.name]: e.target.value })
              }
              rows={4}
              required={field.required}
            />
          </div>
        );

      case "url_list":
        return (
          <div key={field.name}>
            <Label>
              {field.label}{" "}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder={field.placeholder}
                value={currentUrl}
                onChange={(e) => {
                  setCurrentUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addExternalUrl())
                }
                className={urlError ? "border-destructive" : ""}
              />
              <Button
                type="button"
                onClick={addExternalUrl}
                variant="outline"
                size="sm"
              >
                <Link className="h-4 w-4" />
              </Button>
            </div>
            {urlError && (
              <p className="text-sm text-destructive mt-1">{urlError}</p>
            )}
            {externalUrls.length > 0 && (
              <div className="mt-2 space-y-2">
                {externalUrls.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 border rounded"
                  >
                    <Badge variant="outline" className="text-xs">
                      {url.type.replace("_", " ")}
                    </Badge>
                    <span className="text-sm flex-1 truncate">{url.url}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExternalUrl(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "file":
        return (
          <div key={field.name}>
            <Label>
              {field.label}{" "}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <input
                type="file"
                accept={field.accept}
                multiple={field.multiple}
                onChange={handleFileChange}
                className="hidden"
                id={`file-${field.name}`}
              />
              <Label
                htmlFor={`file-${field.name}`}
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  Click to upload files or drag and drop
                </span>
                <span className="text-xs text-muted-foreground">
                  {field.accept || "Any file type"}
                </span>
              </Label>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 border rounded"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isIndividualTask ? "Submit Task" : "Submit Task for Review"}
          </DialogTitle>
          <DialogDescription>
            Complete your submission for <strong>{taskTitle}</strong>.{" "}
            {isIndividualTask
              ? "This will be automatically approved and you'll receive XP/points immediately."
              : "This will be sent to peer reviewers who will provide feedback within 2-3 days. You'll be notified when the review is complete."}
          </DialogDescription>
        </DialogHeader>

        {validationErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm font-medium text-destructive mb-2">
              Please fix the following errors:
            </p>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="text-sm text-destructive">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {schema?.fields?.map(renderField) || (
            <div>No form fields defined</div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? "Submitting..."
              : isIndividualTask
              ? "Submit Task"
              : "Submit for Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
