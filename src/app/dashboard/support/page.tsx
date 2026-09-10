"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  AlertCircle,
  Camera,
  ListOrdered,
  MessageSquare,
  Send,
} from "lucide-react";
import {
  PriorityPicker,
  type TicketPriority,
} from "@/components/support/priority-picker";
import {
  AttachmentsField,
  validateAttachments,
} from "@/components/support/attachments-field";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";

interface SupportTicket {
  priority: TicketPriority;
  category: string;
  title: string;
  description: string;
  attachments: File[];
}

const CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "Technical Issue",
  "Account Problem",
  "Performance Issue",
  "UI/UX Issue",
  "Other",
];

const EMPTY_TICKET: SupportTicket = {
  priority: "medium",
  category: "",
  title: "",
  description: "",
  attachments: [],
};

const RATE_LIMIT_MS = 15 * 60 * 1000; // one ticket per 15 minutes

const TIPS = [
  {
    icon: ListOrdered,
    text: "Steps to reproduce: what you clicked, in order.",
  },
  {
    icon: Camera,
    text: "A screenshot of the problem, or the error text.",
  },
  {
    icon: MessageSquare,
    text: "What you expected to happen instead.",
  },
];

export default function SupportPage() {
  const { user } = useAppContext();
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
      formData.append(
        "userInfo",
        JSON.stringify({
          id: user?.id,
          name: user?.name || "Unknown User",
          email: user?.email || "No email",
        })
      );
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Support
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Found a bug, something looks wrong, or you&apos;re stuck? Tell us here
          and the team will get back to you by email.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="relative gap-0 self-start overflow-hidden py-0">
          <div
            aria-hidden
            className="bg-primary/15 pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl"
          />
          <div className="relative flex flex-col gap-4 p-5">
            <SectionLabel
              icon={MessageSquare}
              title="What helps us fix it fast"
            />
            <ul className="space-y-3">
              {TIPS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm">
                  <span className="bg-primary/10 text-primary mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-muted-foreground leading-relaxed">
                    {text}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground border-t pt-4 text-xs">
              Sending as{" "}
              <span className="text-foreground font-medium">
                {user?.name ?? "…"}
              </span>
              {user?.email && ` · ${user.email}`}
            </p>
          </div>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 p-5 sm:p-6"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <PriorityPicker
                  value={ticket.priority}
                  onChange={(v) => update("priority", v)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={ticket.category}
                  onValueChange={(v) => update("category", v)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Pick one" />
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Title</Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {ticket.title.length}/100
                </span>
              </div>
              <Input
                id="title"
                value={ticket.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="One line: what's wrong?"
                maxLength={100}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {ticket.description.length}/1000
                </span>
              </div>
              <Textarea
                id="description"
                value={ticket.description}
                onChange={(e) => {
                  if (e.target.value.length <= 1000) {
                    update("description", e.target.value);
                  }
                }}
                placeholder="What happened, where, and what you expected instead."
                className="min-h-[160px] resize-y"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              <AttachmentsField
                files={ticket.attachments}
                onAdd={addFiles}
                onRemove={(i) =>
                  update(
                    "attachments",
                    ticket.attachments.filter((_, idx) => idx !== i)
                  )
                }
                disabled={isSubmitting}
              />
            </div>

            {formError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-400"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {formError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 border-t pt-5">
              <Button type="submit" disabled={isSubmitting}>
                <Send className="h-4 w-4" />
                {isSubmitting ? "Sending…" : "Send ticket"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
