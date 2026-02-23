"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Link as LinkIcon,
  Clock,
  MessageSquare,
  CheckCircle,
  XCircle,
  UserCheck,
  Send,
} from "lucide-react";
import type { PeerReviewRow } from "./admin-peer-reviews-table";

interface PeerReviewDetailDialogProps {
  review: PeerReviewRow | null;
  onClose: () => void;
}

function parseSubmission(
  data: Record<string, unknown> | string | null
): Record<string, unknown> {
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  return data;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const eventConfig: Record<
  string,
  { label: string; icon: typeof Clock; color: string }
> = {
  submitted_for_review: {
    label: "Submitted for review",
    icon: Send,
    color: "text-blue-600",
  },
  reviewer_assigned: {
    label: "Reviewer assigned",
    icon: UserCheck,
    color: "text-purple-600",
  },
  review_completed: {
    label: "Review completed",
    icon: CheckCircle,
    color: "text-green-600",
  },
};

export function PeerReviewDetailDialog({
  review,
  onClose,
}: PeerReviewDetailDialogProps) {
  if (!review) return null;

  const submission = parseSubmission(review.submission_data);

  return (
    <Dialog open={!!review} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-lg leading-snug">
              {review.task?.title || "Unknown Task"}
            </DialogTitle>
            <StatusBadge status={review.status} />
          </div>
        </DialogHeader>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm md:grid-cols-4">
          <div>
            <span className="text-muted-foreground block text-xs">Team</span>
            <span className="font-medium">{review.team?.name || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">
              Submitter
            </span>
            <span className="font-medium">{review.submitter?.name || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">
              Reviewer
            </span>
            <span className="font-medium">
              {review.reviewer?.name || "Not assigned"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">
              Category
            </span>
            <span className="font-medium capitalize">
              {review.task?.category?.replace(/-/g, " ") || "—"}
            </span>
          </div>
        </div>

        <Separator />

        {/* Submission Content */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" />
            Submission
          </h4>

          {!submission || Object.keys(submission).length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No submission data available
            </p>
          ) : (
            <div className="space-y-3">
              {/* Description */}
              {typeof submission.description === "string" &&
                submission.description && (
                  <div className="bg-muted/30 rounded-lg border p-3">
                    <p className="text-sm whitespace-pre-wrap">
                      {submission.description}
                    </p>
                  </div>
                )}

              {/* Files */}
              {Array.isArray(submission.files) &&
                submission.files.length > 0 && (
                  <div>
                    <span className="text-muted-foreground mb-2 block text-xs font-medium">
                      Attached Files
                    </span>
                    <div className="space-y-3">
                      {submission.files.map((file: unknown, index: number) => {
                        const fileUrl = String(file);
                        const fileName =
                          fileUrl.split("/").pop() || `File ${index + 1}`;
                        const isImage =
                          /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);

                        return (
                          <div key={index} className="space-y-2">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-blue-600 hover:text-blue-800"
                            >
                              📎 {decodeURIComponent(fileName)}
                            </a>
                            {isImage && (
                              <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
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

              {/* External URLs */}
              {Array.isArray(submission.external_urls) &&
                submission.external_urls.length > 0 && (
                  <div>
                    <span className="text-muted-foreground mb-2 block text-xs font-medium">
                      External URLs
                    </span>
                    <div className="space-y-2">
                      {submission.external_urls.map(
                        (urlItem: unknown, index: number) => {
                          const item = urlItem as Record<string, unknown>;
                          const url =
                            typeof item === "string"
                              ? item
                              : (item?.url as string);
                          const title =
                            typeof item === "string"
                              ? item
                              : (item?.title as string) || "External Link";

                          return (
                            <div
                              key={index}
                              className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-3"
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <LinkIcon className="h-4 w-4 text-green-600" />
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
            </div>
          )}
        </div>

        {/* Review Feedback */}
        {review.review_feedback && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4" />
                Reviewer Feedback
              </h4>
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                <p className="text-sm whitespace-pre-wrap">
                  {review.review_feedback}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Review History Timeline */}
        {review.peer_review_history.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4" />
                Review History
              </h4>
              <div className="relative space-y-0">
                {review.peer_review_history.map((event, index) => {
                  const eventType = event.event_type as string;
                  const config = eventConfig[eventType] || {
                    label: eventType,
                    icon: Clock,
                    color: "text-gray-500",
                  };
                  const Icon =
                    eventType === "review_completed" &&
                    event.decision === "rejected"
                      ? XCircle
                      : config.icon;
                  const color =
                    eventType === "review_completed" &&
                    event.decision === "rejected"
                      ? "text-red-600"
                      : config.color;
                  const isLast =
                    index === review.peer_review_history.length - 1;

                  return (
                    <div key={index} className="relative flex gap-3 pb-4">
                      {/* Timeline line */}
                      {!isLast && (
                        <div className="bg-border absolute top-6 left-[11px] h-full w-px" />
                      )}
                      {/* Icon */}
                      <div className="z-10 flex-shrink-0">
                        <Icon className={`h-6 w-6 ${color}`} />
                      </div>
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">
                            {config.label}
                          </span>
                          {typeof event.decision === "string" &&
                            event.decision && (
                              <span
                                className={`text-xs font-medium ${
                                  event.decision === "rejected"
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              >
                                ({event.decision})
                              </span>
                            )}
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-xs">
                          {formatDate(event.timestamp as string)}
                          {typeof event.reviewer_name === "string" &&
                            event.reviewer_name &&
                            ` · ${event.reviewer_name}`}
                        </div>
                        {typeof event.feedback === "string" &&
                          event.feedback && (
                            <div className="bg-muted/30 mt-1.5 rounded border p-2 text-xs">
                              {event.feedback}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
