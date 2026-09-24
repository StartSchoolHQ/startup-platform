"use client";

import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  severityTone,
  type AttentionRow,
  type SeverityTone,
} from "@/lib/analytics/attention";

const DOT: Record<SeverityTone, string> = {
  negative: "bg-red-500",
  warning: "bg-amber-500",
  neutral: "bg-muted-foreground/50",
};

interface Props {
  row: AttentionRow;
  onDismiss: (userId: string) => void;
}

export function AttentionRowItem({ row, onDismiss }: Props) {
  const tone = severityTone(row.severity);
  const dismissed = !!row.dismissed_until;
  const initials = row.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn("flex items-start gap-3 py-3", dismissed && "opacity-60")}
    >
      <span
        className={cn("mt-2 size-2.5 shrink-0 rounded-full", DOT[tone])}
        aria-label={`Severity ${row.severity}`}
      />
      <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{row.name}</span>
          {row.team_name && <Badge variant="outline">{row.team_name}</Badge>}
          <span className="text-muted-foreground text-xs">
            {row.last_active
              ? `last active ${formatDistanceToNow(new Date(row.last_active))} ago`
              : "never active"}
          </span>
        </div>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {row.reasons.map((reason) => (
            <li key={reason}>
              <Badge variant="secondary" className="font-normal">
                {reason}
              </Badge>
            </li>
          ))}
        </ul>
        {dismissed && (
          <p className="text-muted-foreground mt-1 text-xs">
            Dismissed until {format(new Date(row.dismissed_until), "d MMM")}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8" asChild>
          <Link href="/dashboard/admin/users" aria-label="Open in Users">
            <ExternalLink className="size-4" />
          </Link>
        </Button>
        {!dismissed && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDismiss(row.user_id)}
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
