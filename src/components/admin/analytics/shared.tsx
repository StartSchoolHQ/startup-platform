"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { AdminWeeklyReportViewModal } from "@/components/admin/admin-weekly-report-view-modal";
import { useFullReport } from "./use-analytics";
import { scoreColor } from "./types";

export function ScoreBadge({ score }: { score: number | null }) {
  return (
    <Badge
      variant="outline"
      className="min-w-9 justify-center font-semibold text-white"
      style={{ backgroundColor: scoreColor(score) }}
    >
      {score ?? "—"}
    </Badge>
  );
}

export function TrendIcon({ delta }: { delta: number | null }) {
  if (delta == null || Math.abs(delta) < 0.3) {
    return <Minus className="text-muted-foreground h-4 w-4" />;
  }
  return delta > 0 ? (
    <TrendingUp className="h-4 w-4 text-emerald-500" />
  ) : (
    <TrendingDown className="h-4 w-4 text-red-500" />
  );
}

export function AiPlaceholderCard() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-center gap-3 py-4">
        <Sparkles className="text-muted-foreground h-5 w-5" />
        <div>
          <p className="text-sm font-medium">AI Analysis</p>
          <p className="text-muted-foreground text-xs">
            Automatic summaries of why ratings moved will appear here.
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          Coming soon
        </Badge>
      </CardContent>
    </Card>
  );
}

export function TabError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10">
        <p className="text-muted-foreground text-sm">{message}</p>
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

export function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

/**
 * Fetches one full weekly report and opens the existing admin report modal.
 * Used by every drill-down so a bad score is one click away from the full
 * report of that person for that week.
 */
export function ReportModalLoader({
  reportId,
  onClose,
}: {
  reportId: string | null;
  onClose: () => void;
}) {
  const { data } = useFullReport(reportId);

  return (
    <AdminWeeklyReportViewModal
      open={!!reportId && !!data}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      report={data ?? null}
    />
  );
}
