"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  AI_REVIEW_OUTCOME_STYLES,
  relativeDate,
} from "@/lib/ai-review/admin-ui";
import type { AiReviewAdminRow } from "@/types/ai-review-admin";

interface AiReviewsRowProps {
  review: AiReviewAdminRow;
  flagged: boolean;
  onClick: () => void;
}

export function AiReviewsRow({ review, flagged, onClick }: AiReviewsRowProps) {
  return (
    <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={onClick}>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={review.student?.avatar_url ?? undefined}
              alt={review.student?.name ?? ""}
            />
            <AvatarFallback className="text-xs">
              {(review.student?.name ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>{review.student?.name || "—"}</span>
        </div>
      </TableCell>
      <TableCell className="max-w-[220px] truncate font-medium">
        {review.task?.title || "—"}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            flagged && "border-red-500/40 bg-red-500/10 text-red-600"
          )}
        >
          #{review.attempt}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={AI_REVIEW_OUTCOME_STYLES[review.status] ?? ""}
        >
          {review.status}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {review.reject_reason || "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {review.confidence != null
          ? `${Math.round(review.confidence * 100)}%`
          : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {review.cost_usd != null ? `$${review.cost_usd.toFixed(4)}` : "—"}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {relativeDate(review.created_at)}
      </TableCell>
    </TableRow>
  );
}
