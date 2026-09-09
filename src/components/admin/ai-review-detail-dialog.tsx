"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, ClipboardList, Gavel, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiReviewAdminRow } from "@/types/ai-review-admin";
import type {
  EvidenceManifestEntry,
  NormalizedSubmission,
} from "@/lib/ai-review/types";
import type { AiReviewCriterion } from "@/lib/data/ai-reviews";
import {
  AI_REVIEW_OUTCOME_STYLES,
  formatFullDate,
} from "@/lib/ai-review/admin-ui";
import { SubmissionSection } from "./ai-review-detail-submission";
import { EvidenceManifestSection } from "./ai-review-detail-evidence";
import { CriteriaSection } from "./ai-review-detail-criteria";
import { VerdictSection } from "./ai-review-detail-verdict";

interface AiReviewDetailDialogProps {
  review: AiReviewAdminRow | null;
  onClose: () => void;
}

function parseSubmission(raw: unknown): NormalizedSubmission {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    description: typeof obj.description === "string" ? obj.description : "",
    links: Array.isArray(obj.links)
      ? (obj.links as NormalizedSubmission["links"])
      : [],
    files: Array.isArray(obj.files)
      ? (obj.files as NormalizedSubmission["files"])
      : [],
  };
}

function parseManifest(raw: unknown): EvidenceManifestEntry[] {
  return Array.isArray(raw) ? (raw as EvidenceManifestEntry[]) : [];
}

function parseCriteria(raw: unknown): AiReviewCriterion[] {
  return Array.isArray(raw) ? (raw as AiReviewCriterion[]) : [];
}

export function AiReviewDetailDialog({
  review,
  onClose,
}: AiReviewDetailDialogProps) {
  if (!review) return null;

  const submission = parseSubmission(review.submission_snapshot);
  const manifest = parseManifest(review.evidence_manifest);
  const criteria = parseCriteria(review.criteria_results);

  return (
    <Dialog open={!!review} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-lg leading-snug">
              {review.task?.title || "Unknown Task"}
            </DialogTitle>
            <Badge
              variant="outline"
              className={cn(AI_REVIEW_OUTCOME_STYLES[review.status] ?? "")}
            >
              {review.status}
            </Badge>
          </div>
        </DialogHeader>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm md:grid-cols-4">
          <div>
            <span className="text-muted-foreground block text-xs">Student</span>
            <span className="font-medium">{review.student?.name || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">Attempt</span>
            <span className="font-medium">#{review.attempt}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">
              Submitted
            </span>
            <span className="font-medium">
              {formatFullDate(review.created_at)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-xs">
              Finished
            </span>
            <span className="font-medium">
              {formatFullDate(review.finished_at)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Submission */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4" />
            Submission
          </h4>
          <SubmissionSection submission={submission} />
        </div>

        <Separator />

        {/* Evidence manifest */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4" />
            Evidence Manifest
          </h4>
          <EvidenceManifestSection manifest={manifest} />
        </div>

        <Separator />

        {/* Verdict */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Gavel className="h-4 w-4" />
            Verdict
          </h4>
          <VerdictSection review={review} />
        </div>

        <Separator />

        {/* Criteria */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Criteria</h4>
          <CriteriaSection criteria={criteria} />
        </div>

        {/* Feedback */}
        {review.feedback && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4" />
                Feedback
              </h4>
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                <p className="text-sm whitespace-pre-wrap">{review.feedback}</p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
