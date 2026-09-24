"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatActivity,
  type ActivityRow as Row,
  type ActivityTone,
} from "@/lib/activity/format";

const TONE_CLASS: Record<ActivityTone, string> = {
  positive:
    "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400",
  negative: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  warning:
    "bg-amber-500/10 text-amber-800 border-amber-500/20 dark:text-amber-300",
  neutral: "bg-muted text-muted-foreground border-transparent",
};

export function ActivityRowItem({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const f = formatActivity(row);
  const hasDetail = !!f.detail && f.detail.trim().length > 0;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <time
        dateTime={row.occurred_at}
        className="text-muted-foreground w-12 shrink-0 pt-0.5 text-xs tabular-nums"
        title={format(new Date(row.occurred_at), "d MMM yyyy, HH:mm:ss")}
      >
        {format(new Date(row.occurred_at), "HH:mm")}
      </time>
      <Badge
        variant="outline"
        className={cn("w-20 shrink-0 justify-center", TONE_CLASS[f.tone])}
      >
        {f.badge}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{f.text}</p>
        {hasDetail && open && (
          <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">
            {f.detail}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {hasDetail && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={open ? "Hide details" : "Show details"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                open && "rotate-180"
              )}
            />
          </Button>
        )}
        {f.href && (
          <Button variant="ghost" size="icon" className="size-7" asChild>
            <Link href={f.href} aria-label="Open">
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
