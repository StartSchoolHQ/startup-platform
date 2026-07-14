"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalyticsStudentDetail } from "./use-analytics";
import { ChartTooltip } from "./chart-tooltip";
import { ReportModalLoader, ScoreBadge, AiPlaceholderCard } from "./shared";
import { CHART_COLORS, formatWeek } from "./types";
import type { StudentRow } from "./types";

interface Props {
  student: StudentRow | null;
  onClose: () => void;
}

export function StudentDetailDialog({ student, onClose }: Props) {
  const { data, isLoading } = useAnalyticsStudentDetail(
    student?.user_id ?? null
  );
  const [reportId, setReportId] = useState<string | null>(null);

  const chartData = (data ?? []).map((r) => ({
    label: formatWeek(r.week_start),
    Score: r.score,
  }));
  const feed = [...(data ?? [])].sort((a, b) =>
    a.week_start < b.week_start ? 1 : -1
  );

  return (
    <>
      <Dialog open={!!student} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-2xl">
          <DialogHeader>
            <DialogTitle>{student?.user_name ?? "Student"}</DialogTitle>
            <DialogDescription>
              {student?.team_name ? `${student.team_name} · ` : ""}
              weekly sentiment with their own words. Click a week to open the
              full report.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh] pr-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    fontSize={11}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    dataKey="Score"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="my-4">
                <AiPlaceholderCard />
              </div>

              <div className="space-y-2 pb-4">
                {feed.map((row) => (
                  <button
                    key={row.report_id}
                    onClick={() => setReportId(row.report_id)}
                    className="hover:bg-muted/50 w-full rounded-lg border p-3 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ScoreBadge score={row.score} />
                      <span className="text-muted-foreground ml-auto text-xs">
                        {formatWeek(row.week_start)}
                      </span>
                    </div>
                    {row.alignment_reason && (
                      <p className="text-muted-foreground mt-1.5 text-sm italic">
                        &ldquo;{row.alignment_reason}&rdquo;
                      </p>
                    )}
                    {row.blockers && (
                      <p className="mt-1 text-xs text-red-500/90">
                        Blocker: {row.blockers}
                      </p>
                    )}
                    {row.biggest_achievement && (
                      <p className="mt-1 text-xs text-emerald-600">
                        Win: {row.biggest_achievement}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
      <ReportModalLoader
        reportId={reportId}
        onClose={() => setReportId(null)}
      />
    </>
  );
}
