"use client";

import { useState } from "react";
import { useAppContext } from "@/contexts/app-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  HelpCircle,
  Send,
  Upload,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";

interface SupportTicket {
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  title: string;
  description: string;
  attachments?: File[];
}

const PRIORITY_COLORS = {
  low: "text-gray-600",
  medium: "text-yellow-600",
  high: "text-orange-600",
  critical: "text-red-600",
};

const PRIORITY_LABELS = {
  low: "🟢 Low",
  medium: "🟡 Medium",
  high: "🟠 High",
  critical: "🔴 Critical",
};

const CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "Technical Issue",
  "Account Problem",
  "Performance Issue",
  "UI/UX Issue",
  "Other",
];

const ALLOWED_FILE_TYPES = [
  // Images
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Text files
  "text/plain",
  "text/csv",
  // Office documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Logs
  "application/x-log",
  "application/octet-stream", // Sometimes used for .log files
];

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB (Discord limit)
const MAX_FILES = 3;

export default function SupportPage() {
  const { user } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);

  const [ticket, setTicket] = useState<SupportTicket>({
    priority: "medium",
    category: "",
    title: "",
    description: "",
    attachments: [],
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // Validate file count
    if (files.length + (ticket.attachments?.length || 0) > MAX_FILES) {
      setErrorMessage(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of files) {
      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setErrorMessage(
          `File "${file.name}" type not supported. Allowed: Images (PNG, JPG, GIF, WebP, SVG), Documents (PDF, Word, Excel), Text files (TXT, CSV, LOG)`
        );
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(
          `File "${file.name}" exceeds 8MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`
        );
        return;
      }

      validFiles.push(file);
    }

    setTicket((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...validFiles],
    }));
    setErrorMessage("");
  };

  const removeFile = (index: number) => {
    setTicket((prev) => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting: 1 ticket per 15 minutes
    const now = Date.now();
    if (now - lastSubmissionTime < 15 * 60 * 1000) {
      const remaining = Math.ceil(
        (15 * 60 * 1000 - (now - lastSubmissionTime)) / 60000
      );
      setErrorMessage(
        `Please wait ${remaining} minutes before submitting another ticket.`
      );
      return;
    }

    // Validation
    if (
      !ticket.category ||
      !ticket.title.trim() ||
      !ticket.description.trim()
    ) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (ticket.title.length > 100) {
      setErrorMessage("Title must be 100 characters or less.");
      return;
    }

    if (ticket.description.length > 1000) {
      setErrorMessage("Description must be 1000 characters or less.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSubmitStatus("idle");

    try {
      const formData = new FormData();
      formData.append("priority", ticket.priority);
      formData.append("category", ticket.category);
      formData.append("title", ticket.title);
      formData.append("description", ticket.description);
      formData.append(
        "userInfo",
        JSON.stringify({
          id: user?.id,
          name: user?.name || "Unknown User",
          email: user?.email || "No email",
        })
      );

      // Add files if any
      ticket.attachments?.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });

      const response = await fetch("/api/support/ticket", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();

        // Handle specific error cases
        if (response.status === 429) {
          throw new Error(
            error.error ||
              "Too many requests. Please wait before submitting another ticket."
          );
        } else if (response.status === 503) {
          throw new Error(
            error.error ||
              "Support system is temporarily unavailable. Please try again later."
          );
        } else {
          throw new Error(
            error.error || error.message || "Failed to submit ticket"
          );
        }
      }

      await response.json(); // Success response (no need to store)

      setSubmitStatus("success");
      setLastSubmissionTime(now);

      // Reset form
      setTicket({
        priority: "medium",
        category: "",
        title: "",
        description: "",
        attachments: [],
      });

      // Clear file input
      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Error submitting ticket:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to submit ticket. Please try again."
      );
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Support</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <HelpCircle className="h-10 w-10 text-blue-600" />
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            Support & Bug Reports
          </h1>
          <p className="text-muted-foreground text-lg">
            Report issues, bugs, or request help from our support team
          </p>
        </div>
      </div>

      {/* Success Alert */}
      {submitStatus === "success" && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <div className="text-green-800">
            <strong>Ticket submitted successfully!</strong> Our team has been
            notified and will respond soon.
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div className="text-red-800">{errorMessage}</div>
        </div>
      )}

      {/* Support Form */}
      <div className="flex justify-center">
        <Card className="w-full max-w-4xl shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl">Submit Support Ticket</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* User Info (Read-only) */}
              <div className="rounded-lg bg-gray-50 p-6">
                <h3 className="mb-4 text-sm font-medium text-gray-700">
                  User Information
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">Your Name</Label>
                    <Input
                      value={user?.name || "Loading..."}
                      disabled
                      className="mt-2 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Your Email</Label>
                    <Input
                      value={user?.email || "Loading..."}
                      disabled
                      className="mt-2 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Priority and Category */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="priority" className="text-sm font-medium">
                    Priority *
                  </Label>
                  <div className="mt-2">
                    <Select
                      value={ticket.priority}
                      onValueChange={(value: SupportTicket["priority"]) =>
                        setTicket((prev) => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low" className={PRIORITY_COLORS.low}>
                          {PRIORITY_LABELS.low}
                        </SelectItem>
                        <SelectItem
                          value="medium"
                          className={PRIORITY_COLORS.medium}
                        >
                          {PRIORITY_LABELS.medium}
                        </SelectItem>
                        <SelectItem
                          value="high"
                          className={PRIORITY_COLORS.high}
                        >
                          {PRIORITY_LABELS.high}
                        </SelectItem>
                        <SelectItem
                          value="critical"
                          className={PRIORITY_COLORS.critical}
                        >
                          {PRIORITY_LABELS.critical}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="category" className="text-sm font-medium">
                    Category *
                  </Label>
                  <div className="mt-2">
                    <Select
                      value={ticket.category}
                      onValueChange={(value) =>
                        setTicket((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Title *
                </Label>
                <Input
                  className="mt-2"
                  id="title"
                  value={ticket.title}
                  onChange={(e) =>
                    setTicket((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Brief description of the issue"
                  maxLength={100}
                  required
                />
                <div className="text-muted-foreground mt-1 text-xs">
                  {ticket.title.length}/100 characters
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={ticket.description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 2000) {
                      setTicket((prev) => ({
                        ...prev,
                        description: value,
                      }));
                    }
                  }}
                  placeholder="Please provide detailed information about the issue, including steps to reproduce if applicable."
                  className="mt-2 min-h-[140px]"
                  required
                />
                <div className="text-muted-foreground mt-1 text-xs">
                  {ticket.description.length}/2000 characters
                </div>
              </div>

              {/* File Upload */}
              <div className="rounded-lg border-2 border-dashed border-gray-200 p-6">
                <Label htmlFor="file-upload" className="text-sm font-medium">
                  Attachments (Optional)
                </Label>
                <div className="mt-4">
                  <Input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,.txt,.csv,.log,.pdf,.doc,.docx,.xls,.xlsx"
                    className="cursor-pointer"
                  />
                  <div className="text-muted-foreground mt-3 text-sm">
                    Max {MAX_FILES} files, 8MB each. Supported: Images (PNG,
                    JPG, GIF, WebP, SVG), Documents (PDF, Word, Excel), Text
                    (TXT, CSV, LOG)
                  </div>
                </div>

                {/* File List */}
                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {ticket.attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md bg-gray-50 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4 text-gray-500" />
                          <span className="truncate text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(1)}MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="border-t pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full text-base font-medium"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Support Ticket
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
