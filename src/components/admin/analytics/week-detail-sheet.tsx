"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsWeekDetail } from "./use-analytics";
import { ReportModalLoader, ScoreBadge } from "./shared";
import { formatWeek } from "./types";

interface Props {
  weekStart: string | null;
  onClose: () => void;
}

/**
 * All reports of one week, lowest scores first, with the student's own
 * words. Clicking an entry opens the full weekly report.
 */
export function WeekDetailSheet({ weekStart, onClose }: Props) {
  const { data, isLoading } = useAnalyticsWeekDetail(weekStart);
  const [reportId, setReportId] = useState<string | null>(null);

  return (
    <>
      <Sheet open={!!weekStart} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              Week of {weekStart ? formatWeek(weekStart) : ""}
            </SheetTitle>
            <SheetDescription>
              Sorted lowest score first. Click an entry to open the full report.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
            {isLoading && (
              <div className="space-y-3 py-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            )}
            <div className="space-y-3 py-4">
              {data?.map((row) => (
                <button
                  key={row.report_id}
                  onClick={() => setReportId(row.report_id)}
                  className="hover:bg-muted/50 w-full rounded-lg border p-3 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={row.score} />
                    <span className="text-sm font-medium">
                      {row.user_name ?? "Unknown"}
                    </span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {row.team_name ?? "No team"}
                    </span>
                  </div>
                  {row.alignment_reason && (
                    <p className="text-muted-foreground mt-2 text-sm italic">
                      &ldquo;{row.alignment_reason}&rdquo;
                    </p>
                  )}
                  {row.blockers && (
                    <p className="mt-1 text-xs text-red-500/90">
                      Blocker: {row.blockers}
                    </p>
                  )}
                </button>
              ))}
              {data && data.length === 0 && (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No reports submitted this week.
                </p>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <ReportModalLoader
        reportId={reportId}
        onClose={() => setReportId(null)}
      />
    </>
  );
}
