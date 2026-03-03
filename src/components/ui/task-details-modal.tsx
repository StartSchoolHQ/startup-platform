"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge, TaskStatus } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/date-utils";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, FileText, Link, Upload, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

// Common interfaces
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

// Task interfaces (simplified versions of what we expect)
interface BaseTask {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  base_xp_reward?: number;
  base_points_reward?: number;
  learning_objectives?: string[];
  deliverables?: string[];
  peer_review_criteria?: Array<{
    category: string;
    points: string[];
  }>;
  submission_form_schema?: FormSchema;
}

interface BaseTeam {
  id?: string;
  name?: string;
}

interface BaseUser {
  id?: string;
  name?: string;
  avatar_url?: string;
}

// Task data for review/feedback modes (flexible to match different data structures)
interface TaskProgressData {
  id?: string;
  status: string;
  submission_data?: string | Record<string, unknown>;
  submission_notes?: string;
  completed_at?: string;
  reviewer?: BaseUser | null;
  reviewer_name?: string;
  reviewer_avatar_url?: string;
  tasks?: BaseTask | null;
  teams?: BaseTeam | null;
}

// Modal props
interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "submission" | "review" | "feedback";

  // Submission mode props
  onSubmit?: (submissionData: SubmissionData) => Promise<void>;
  taskTitle?: string;
  formSchema?: FormSchema;
  isLoading?: boolean;
  initialData?: {
    description?: string;
    external_urls?: ExternalUrl[];
    [key: string]: unknown;
  };

  // Review mode props
  taskData?: TaskProgressData;
  onReviewSubmit?: (
    feedback: string,
    decision: "accepted" | "rejected"
  ) => Promise<void>;
  submittingReview?: boolean;

  // Feedback mode props (uses taskData)
}

export function TaskDetailsModal({
  isOpen,
  onClose,
  mode,
  onSubmit,
  taskTitle,
  formSchema,
  isLoading = false,
  initialData,
  taskData,
  onReviewSubmit,
  submittingReview = false,
}: TaskDetailsModalProps) {
  // Submission mode state
  const [formData, setFormData] = useState<Record<string, string | string[]>>(
    {}
  );
  const [externalUrls, setExternalUrls] = useState<ExternalUrl[]>([]);
  const [currentUrl, setCurrentUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Review mode state
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewDecision, setReviewDecision] = useState<
    "accepted" | "rejected" | null
  >(null);

  // Reset form state when modal opens/closes or task changes
  useEffect(() => {
    if (!isOpen) {
      // Modal closed - reset everything
      setFormData({});
      setExternalUrls([]);
      setCurrentUrl("");
      setUploadedFiles([]);
      setUrlError(null);
      setValidationErrors([]);
      setReviewFeedback("");
      setReviewDecision(null);
    } else if (mode === "review") {
      // Modal opened for review - reset review-specific state
      setReviewFeedback("");
      setReviewDecision(null);
    } else if (mode === "submission") {
      // Modal opened for submission - pre-populate from previous data if available
      if (initialData) {
        const prefill: Record<string, string | string[]> = {};
        if (typeof initialData.description === "string") {
          prefill.description = initialData.description;
        }
        // Also restore any custom form fields from previous submission
        for (const [key, value] of Object.entries(initialData)) {
          if (
            key !== "description" &&
            key !== "external_urls" &&
            key !== "files" &&
            key !== "submitted_at" &&
            key !== "completed_by" &&
            key !== "completion_date" &&
            typeof value === "string"
          ) {
            prefill[key] = value;
          }
        }
        setFormData(prefill);
        setExternalUrls(
          Array.isArray(initialData.external_urls)
            ? initialData.external_urls
            : []
        );
      } else {
        setFormData({});
        setExternalUrls([]);
      }
      setCurrentUrl("");
      setUploadedFiles([]);
      setUrlError(null);
      setValidationErrors([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, taskData?.id]);

  // Default form schema for submission mode
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

  const schema = formSchema || defaultSchema;

  // Utility functions
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

  // Submission handlers
  const handleSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;

    // Validate required fields
    const errors: string[] = [];

    if (schema?.fields) {
      // Validate custom schema fields
      schema.fields.forEach((field) => {
        if (field.required) {
          if (field.name === "external_urls" && externalUrls.length === 0) {
            errors.push(`${field.label} is required`);
          } else if (
            field.name === "screenshots" &&
            uploadedFiles.length === 0
          ) {
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
    } else {
      // Validate default form fields (description is required)
      if (
        typeof formData.description === "string" &&
        !formData.description?.trim()
      ) {
        errors.push("Task Completion Description is required");
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);

    // Prepare submission data
    const submissionData = {
      ...formData,
      external_urls: externalUrls,
      files: uploadedFiles,
      submitted_at: new Date().toISOString(),
    };

    await onSubmit(submissionData);
  };

  // Review handlers
  const handleReviewSubmit = async () => {
    if (!onReviewSubmit || !reviewDecision) return;
    await onReviewSubmit(reviewFeedback, reviewDecision);
  };

  // Parse submission data for display
  const parseSubmissionData = (
    submissionData?: string | Record<string, unknown>
  ) => {
    if (!submissionData) return {};

    try {
      return typeof submissionData === "string"
        ? JSON.parse(submissionData)
        : submissionData;
    } catch (error) {
      console.error("Error parsing submission data:", error);
      return {};
    }
  };

  // Render different modal content based on mode
  const renderModalContent = () => {
    switch (mode) {
      case "submission":
        return renderSubmissionContent();
      case "review":
        return renderReviewContent();
      case "feedback":
        return renderFeedbackContent();
      default:
        return null;
    }
  };

  const renderSubmissionContent = () => (
    <>
      <DialogHeader>
        <DialogTitle>Submit Task for Review</DialogTitle>
        <DialogDescription>
          Complete your submission for <strong>{taskTitle}</strong>. This will
          be sent to peer reviewers who will evaluate your work and provide
          feedback within 2-3 days. You&apos;ll receive a notification when the
          review is complete.
        </DialogDescription>
      </DialogHeader>

      {validationErrors.length > 0 && (
        <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
          <p className="text-destructive mb-2 text-sm font-medium">
            Please fix the following errors:
          </p>
          <ul className="list-inside list-disc space-y-1">
            {validationErrors.map((error, idx) => (
              <li key={idx} className="text-destructive text-sm">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmissionSubmit} className="space-y-6">
        {schema?.fields?.length > 0 ? (
          schema.fields.map(renderFormField)
        ) : (
          // Default submission form when no schema is defined
          <>
            <div className="space-y-2">
              <Label htmlFor="description">Task Completion Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe what you completed and how you approached this task..."
                value={(formData.description as string) || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>External URLs (Optional)</Label>
              <div className="space-y-2">
                {externalUrls.map((urlItem, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="URL title"
                      value={urlItem.title}
                      onChange={(e) => {
                        const newUrls = [...externalUrls];
                        newUrls[index].title = e.target.value;
                        setExternalUrls(newUrls);
                      }}
                      className="flex-1"
                    />
                    <Input
                      placeholder="https://example.com"
                      value={urlItem.url}
                      onChange={(e) => {
                        const newUrls = [...externalUrls];
                        newUrls[index].url = e.target.value;
                        setExternalUrls(newUrls);
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newUrls = externalUrls.filter(
                          (_, i) => i !== index
                        );
                        setExternalUrls(newUrls);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setExternalUrls([
                      ...externalUrls,
                      { url: "", title: "", type: "link" },
                    ])
                  }
                  className="w-full"
                >
                  <Link className="mr-2 h-4 w-4" />
                  Add URL
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>File Attachments (Optional)</Label>
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-4">
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      setUploadedFiles((prev) => [
                        ...prev,
                        ...Array.from(e.target.files!),
                      ]);
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex cursor-pointer flex-col items-center justify-center"
                >
                  <Upload className="mb-2 h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Click to upload files or drag and drop
                  </span>
                </label>
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded bg-gray-50 p-2"
                      >
                        <span className="text-sm">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newFiles = uploadedFiles.filter(
                              (_, i) => i !== index
                            );
                            setUploadedFiles(newFiles);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
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
        <Button
          type="submit"
          onClick={handleSubmissionSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Submitting..." : "Submit for Review"}
        </Button>
      </DialogFooter>
    </>
  );

  const renderReviewContent = () => {
    if (!taskData) return null;

    const submission = parseSubmissionData(taskData.submission_data);

    return (
      <>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Review Task: {taskData.tasks?.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto pr-4">
          {/* Task Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="mb-2 font-medium">Task Details</h3>
            <p className="text-muted-foreground mb-2 text-sm">
              {taskData.tasks?.description}
            </p>
            <div className="flex gap-4 text-sm">
              <span>
                Team: <strong>{taskData.teams?.name}</strong>
              </span>
              <span>
                XP Reward: <strong>{taskData.tasks?.base_xp_reward}</strong>
              </span>
            </div>
          </div>

          {/* Submission Data */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="mb-2 font-medium">Submission</h3>
            {renderSubmissionDisplay(submission)}
          </div>

          {/* Peer Review Criteria */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="mb-3 font-medium">Peer Review Criteria</h3>
            {taskData.tasks?.peer_review_criteria &&
            Array.isArray(taskData.tasks.peer_review_criteria) &&
            taskData.tasks.peer_review_criteria.length > 0 ? (
              <div className="space-y-4">
                {taskData.tasks.peer_review_criteria.map((criteria, index) => (
                  <div key={index}>
                    <h4 className="mb-2 text-sm font-semibold text-purple-900">
                      {criteria.category}
                    </h4>
                    <div className="text-muted-foreground space-y-3 text-sm [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:font-bold [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1.5">
                      {criteria.points.map((point, pointIndex) => (
                        <div key={pointIndex}>
                          <ReactMarkdown>{point}</ReactMarkdown>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No review criteria available for this task.
              </p>
            )}
          </div>

          {/* Review Form */}
          <div className="space-y-4 px-1 pb-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Review Feedback
              </label>
              <Textarea
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Provide feedback on the task submission..."
                rows={4}
                className="w-full"
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant={reviewDecision === "accepted" ? "default" : "outline"}
                onClick={() => setReviewDecision("accepted")}
                className={`flex-1 transition-all duration-200 ${
                  reviewDecision === "accepted"
                    ? "border-green-600 bg-green-600 text-white hover:bg-green-700"
                    : "hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                }`}
              >
                {reviewDecision === "accepted" && (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Accept Task
              </Button>
              <Button
                type="button"
                variant={
                  reviewDecision === "rejected" ? "destructive" : "outline"
                }
                onClick={() => setReviewDecision("rejected")}
                className={`flex-1 transition-all duration-200 ${
                  reviewDecision === "rejected"
                    ? ""
                    : "hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                }`}
              >
                {reviewDecision === "rejected" && (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Reject Task
              </Button>
            </div>

            {/* Decision Confirmation Badge */}
            <AnimatePresence>
              {reviewDecision && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 ${
                    reviewDecision === "accepted"
                      ? "border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-950/30"
                      : "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30"
                  }`}
                >
                  {reviewDecision === "accepted" ? (
                    <>
                      <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">
                        You will accept this task
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium text-red-900 dark:text-red-100">
                        You will reject this task
                      </span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Fixed Footer with Action Buttons */}
        <div className="bg-background flex flex-shrink-0 gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleReviewSubmit}
            disabled={!reviewDecision || submittingReview}
            className={`flex-1 transition-all duration-200 ${
              reviewDecision === "accepted"
                ? "bg-green-600 text-white hover:bg-green-700"
                : reviewDecision === "rejected"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
            }`}
          >
            {submittingReview ? (
              "Submitting..."
            ) : reviewDecision === "accepted" ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Submit Acceptance
              </>
            ) : reviewDecision === "rejected" ? (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Submit Rejection
              </>
            ) : (
              "Submit Review"
            )}
          </Button>
        </div>
      </>
    );
  };

  const renderFeedbackContent = () => {
    if (!taskData) return null;

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Peer Review Feedback</span>
            <StatusBadge status={taskData.status as TaskStatus} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="mb-1 text-sm font-medium">
              {taskData.tasks?.title}
            </h3>
            <p className="text-muted-foreground text-xs">
              Team: {taskData.teams?.name}
            </p>
          </div>

          {/* Reviewer Feedback */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Reviewer Feedback:</span>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="leading-relaxed whitespace-pre-wrap text-gray-700">
                {(() => {
                  const notes = taskData.submission_notes;
                  if (!notes) {
                    return taskData.status === "rejected"
                      ? "This task was rejected but no specific feedback was provided."
                      : "No feedback provided";
                  }

                  // If notes contain "Peer Review:", extract the part after it
                  if (notes.includes("Peer Review:")) {
                    const feedback = notes.split("Peer Review:").pop()?.trim();
                    return feedback || "No specific feedback provided";
                  }

                  // Otherwise, show the full notes as feedback
                  return notes;
                })()}
              </p>
            </div>
          </div>

          {/* Reviewer Info */}
          {taskData.reviewer && (
            <div className="flex items-center gap-3 border-t pt-4">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={taskData.reviewer.avatar_url}
                  alt={taskData.reviewer.name || "Reviewer"}
                />
                <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-sm font-bold text-white">
                  {taskData.reviewer.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "PR"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">
                  {taskData.reviewer.name || "Peer Reviewer"}
                </div>
                <div className="text-muted-foreground text-xs">
                  Reviewed on{" "}
                  {taskData.completed_at
                    ? formatDate(taskData.completed_at)
                    : "Recently"}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </>
    );
  };

  const renderSubmissionDisplay = (submission: Record<string, unknown>) => {
    if (!submission || Object.keys(submission).length === 0) {
      return (
        <p className="text-muted-foreground text-sm">
          No submission data available
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {typeof submission.description === "string" &&
          submission.description && (
            <div>
              <span className="text-sm font-medium">Description:</span>
              <p className="mt-1 text-sm">{submission.description}</p>
            </div>
          )}

        {Array.isArray(submission.files) && submission.files.length > 0 && (
          <div>
            <span className="text-sm font-medium">Files:</span>
            <div className="mt-2 space-y-3">
              {submission.files.map((file: unknown, index: number) => {
                const fileUrl = String(file);
                const fileName =
                  fileUrl.split("/").pop() || `File ${index + 1}`;
                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
                  fileName
                );

                return (
                  <div key={index} className="space-y-2">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-blue-600 hover:text-blue-800"
                    >
                      📎 {fileName}
                    </a>
                    {isImage && (
                      <div className="mt-2 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-800">
                          <FileText className="h-4 w-4" />
                          Image Preview
                        </div>
                        <div className="relative rounded-lg bg-white p-2 shadow-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={fileUrl}
                            alt={fileName}
                            className="max-h-80 w-full rounded border object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const errorDiv = document.createElement("div");
                              errorDiv.className =
                                "text-red-600 text-sm p-4 text-center";
                              errorDiv.textContent = "Failed to load image";
                              target.parentNode?.appendChild(errorDiv);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {Array.isArray(submission.external_urls) &&
          submission.external_urls.length > 0 && (
            <div>
              <span className="text-sm font-medium">External URLs:</span>
              <div className="mt-2 space-y-2">
                {(submission.external_urls || []).map(
                  (urlItem: unknown, index: number) => {
                    // Handle both string URLs and URL objects
                    const urlObj = urlItem as { url?: string; title?: string };
                    const url =
                      typeof urlItem === "string" ? urlItem : urlObj?.url;
                    const title =
                      typeof urlItem === "string"
                        ? urlItem
                        : urlObj?.title || "External Link";

                    return (
                      <div
                        key={index}
                        className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-3"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <Link className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            {title}
                          </span>
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm break-all text-blue-600 underline hover:text-blue-800"
                        >
                          {url}
                        </a>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

        {typeof submission.submitted_at === "string" &&
          submission.submitted_at && (
            <div>
              <span className="text-sm font-medium">Submitted:</span>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatDate(submission.submitted_at)}
              </p>
            </div>
          )}
      </div>
    );
  };

  const renderFormField = (field: FormField) => {
    switch (field.type) {
      case "text":
        return (
          <div key={field.name}>
            <Label htmlFor={field.name}>
              {field.label}{" "}
              {field.required && <span className="text-red-500">*</span>}
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
              {field.required && <span className="text-red-500">*</span>}
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
              {field.required && <span className="text-red-500">*</span>}
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
              <p className="text-destructive mt-1 text-sm">{urlError}</p>
            )}
            {externalUrls.length > 0 && (
              <div className="mt-2 space-y-2">
                {externalUrls.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded border p-2"
                  >
                    <Badge variant="outline" className="text-xs">
                      {url.type.replace("_", " ")}
                    </Badge>
                    <span className="flex-1 truncate text-sm">{url.url}</span>
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
              {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-4">
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
                className="flex cursor-pointer flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Click to upload files or drag and drop
                </span>
                <span className="text-xs text-gray-400">
                  {field.accept || "Any file type"}
                </span>
              </Label>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded border p-2"
                  >
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="flex-1 text-sm">{file.name}</span>
                    <span className="text-xs text-gray-400">
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
      <DialogContent
        className={`max-w-${mode === "review" ? "4xl" : "2xl"} max-h-[90vh] ${
          mode === "review"
            ? "flex flex-col overflow-hidden"
            : "overflow-y-auto"
        }`}
      >
        {renderModalContent()}
      </DialogContent>
    </Dialog>
  );
}
