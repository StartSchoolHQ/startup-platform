"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendIcon } from "@/components/admin/analytics/shared";
import { useBatchScope, withBatch } from "@/hooks/use-batch-scope";
import type { MotivationSummary } from "@/lib/admin/weekly-report-motivation";

interface SummaryResponse extends MotivationSummary {
  week_start: string;
  week_end: string;
}

function shortDate(iso: string, withMonth: boolean): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDate();
  if (!withMonth) return String(day);
  const month = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  return `${month} ${day}`;
}

/** "Oct 5–11" or "Sep 28–Oct 4". */
function weekLabel(start: string, end: string): string {
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${shortDate(start, true)}–${shortDate(end, !sameMonth)}`;
}

/**
 * Average motivation score of last week's submitted solo reports, scoped by
 * the batch selector like the table below it. Ignores the table filters.
 */
export function WeeklyReportsMotivationCard() {
  const { batchId, isLoading: scopeLoading } = useBatchScope();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-weekly-reports", "summary", batchId ?? "current"],
    enabled: !scopeLoading,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SummaryResponse> => {
      const res = await fetch(
        withBatch("/api/admin/weekly-reports/summary", batchId)
      );
      if (!res.ok) throw new Error("Failed to load motivation summary");
      return res.json();
    },
  });

  if (isLoading || scopeLoading) {
    return <Skeleton className="h-24 w-full rounded-xl sm:w-72" />;
  }

  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
  const hasAverage = data !== undefined && data.average !== null;
  const sub = isError
    ? "Could not load last week's reports"
    : !hasAverage
      ? "No solo reports last week"
      : [
          `${data.count} solo report${data.count === 1 ? "" : "s"}`,
          weekLabel(data.week_start, data.week_end),
          data.delta === null
            ? "out of 10"
            : `${signed(data.delta)} vs the week before`,
        ].join(" · ");

  return (
    <Card className="sm:w-72">
      <CardContent className="p-4">
        <p className="text-muted-foreground text-xs">Motivation last week</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-semibold tabular-nums">
            {hasAverage ? `${data.average} / 10` : "—"}
          </p>
          {hasAverage && <TrendIcon delta={data.delta} />}
        </div>
        <p className="text-muted-foreground text-xs">{sub}</p>
      </CardContent>
    </Card>
  );
}
