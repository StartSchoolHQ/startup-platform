"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { TicketPriority } from "@/components/support/priority-picker";
import { validateAttachments } from "@/components/support/attachments-field";

export interface SupportTicket {
  priority: TicketPriority;
  category: string;
  title: string;
  description: string;
  attachments: File[];
}

const EMPTY_TICKET: SupportTicket = {
  priority: "medium",
  category: "",
  title: "",
  description: "",
  attachments: [],
};

const RATE_LIMIT_MS = 15 * 60 * 1000; // one ticket per 15 minutes

/** Owns the report-problem form's state, validation and submit call. */
export function useReportProblemForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  const [ticket, setTicket] = useState<SupportTicket>(EMPTY_TICKET);

  const update = <K extends keyof SupportTicket>(
    key: K,
    value: SupportTicket[K]
  ) => {
    setTicket((prev) => ({ ...prev, [key]: value }));
    if (formError) setFormError("");
  };

  const addFiles = (incoming: File[]) => {
    const result = validateAttachments(incoming, ticket.attachments);
    if ("error" in result) {
      setFormError(result.error);
      return;
    }
    update("attachments", [...ticket.attachments, ...result.files]);
  };

  const removeAttachment = (index: number) => {
    update(
      "attachments",
      ticket.attachments.filter((_, idx) => idx !== index)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastSubmissionTime < RATE_LIMIT_MS) {
      const remaining = Math.ceil(
        (RATE_LIMIT_MS - (now - lastSubmissionTime)) / 60000
      );
      setFormError(
        `You sent a ticket a moment ago. Please wait ${remaining} more minute${remaining === 1 ? "" : "s"}.`
      );
      return;
    }
    if (
      !ticket.category ||
      !ticket.title.trim() ||
      !ticket.description.trim()
    ) {
      setFormError("Category, title and description are required.");
      return;
    }
    if (ticket.description.length > 1000) {
      setFormError(
        "Description is too long — keep it under 1000 characters and attach the rest as a file."
      );
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      const formData = new FormData();
      formData.append("priority", ticket.priority);
      formData.append("category", ticket.category);
      formData.append("title", ticket.title);
      formData.append("description", ticket.description);
      ticket.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });
      const response = await fetch("/api/support/ticket", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const fallback =
          response.status === 429
            ? "Too many requests. Please wait before sending another ticket."
            : response.status === 503
              ? "Support is temporarily unavailable. Please try again later."
              : "Failed to send the ticket.";
        throw new Error(error.error || error.message || fallback);
      }
      setLastSubmissionTime(now);
      setTicket(EMPTY_TICKET);
      toast.success("Ticket sent", {
        description: "The team has it and will reply to your email.",
      });
    } catch (error) {
      toast.error("Ticket not sent", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    ticket,
    update,
    addFiles,
    removeAttachment,
    handleSubmit,
    isSubmitting,
    formError,
  };
}
