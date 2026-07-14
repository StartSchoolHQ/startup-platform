"use client";

import { useMemo, useState } from "react";
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
  Legend,
} from "recharts";
import { useAnalyticsTeamDetail } from "./use-analytics";
import { ChartTooltip } from "./chart-tooltip";
import { ReportModalLoader, ScoreBadge, AiPlaceholderCard } from "./shared";
import { SERIES_COLORS, formatWeek } from "./types";
import type { TeamSummary } from "./teams-tab";

interface Props {
  team: TeamSummary | null;
  onClose: () => void;
}

export function TeamDetailDialog({ team, onClose }: Props) {
  const { data, isLoading } = useAnalyticsTeamDetail(team?.teamId ?? null);
  const [reportId, setReportId] = useState<string | null>(null);

  const { members, chartData, feed } = useMemo(() => {
    if (!data) return { members: [], chartData: [], feed: [] };
    // Fixed member order (first appearance) so colors stay stable
    const members = [...new Set(data.map((r) => r.user_name ?? "Unknown"))];
    const byWeek = new Map<string, Record<string, string | number | null>>();
    for (const row of data) {
      const key = row.week_start;
      if (!byWeek.has(key)) {
        byWeek.set(key, { label: formatWeek(key) });
      }
      byWeek.get(key)![row.user_name ?? "Unknown"] = row.score;
    }
    const chartData = [...byWeek.values()];
    const feed = [...data].sort((a, b) =>
      a.week_start < b.week_start ? 1 : -1
    );
    return { members, chartData, feed };
  }, [data]);

  return (
    <>
      <Dialog open={!!team} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-3xl">
          <DialogHeader>
            <DialogTitle>{team?.teamName}</DialogTitle>
            <DialogDescription>
              Per-member sentiment and their own words, newest first. Click a
              comment to open that week&apos;s full report.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh] pr-4">
              <ResponsiveContainer width="100%" height={240}>
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
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {members.map((name, i) => (
                    <Line
                      key={name}
                      dataKey={name}
                      stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  ))}
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
                      <span className="text-sm font-medium">
                        {row.user_name ?? "Unknown"}
                      </span>
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
                    {row.key_insight && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Insight: {row.key_insight}
                      </p>
                    )}
                    {row.team_recognition && (
                      <p className="mt-1 text-xs text-emerald-600">
                        Recognition: {row.team_recognition}
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
