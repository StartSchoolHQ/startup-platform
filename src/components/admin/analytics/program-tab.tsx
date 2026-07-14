"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalyticsRetention } from "./use-analytics";
import { ChartTooltip } from "./chart-tooltip";
import { ScoreBadge, TabError, TabSkeleton } from "./shared";
import { CHART_COLORS, formatWeek } from "./types";
import { ProgramAccountability } from "./program-accountability";

export function ProgramTab({ active }: { active: boolean }) {
  const { data, isLoading, isError, refetch } = useAnalyticsRetention(active);

  const chartData = useMemo(() => {
    if (!data) return [];
    const byWeek = new Map<
      string,
      { label: string; Reporting: number; Left: number }
    >();
    for (const c of data.cohort) {
      byWeek.set(c.week_start, {
        label: formatWeek(c.week_start),
        Reporting: c.reporters,
        Left: 0,
      });
    }
    for (const d of data.departures) {
      const entry = byWeek.get(d.week_start);
      if (entry) entry.Left = d.members_left;
      else
        byWeek.set(d.week_start, {
          label: formatWeek(d.week_start),
          Reporting: 0,
          Left: d.members_left,
        });
    }
    return [...byWeek.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([, v]) => v);
  }, [data]);

  if (isLoading) return <TabSkeleton />;
  if (isError || !data) {
    return (
      <TabError
        message="Could not load program analytics."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Retention</CardTitle>
          <CardDescription>
            Of the {data.total_reporters} students who ever submitted a weekly
            report: how many were still reporting each week, and how many left a
            team. This curve is the program&apos;s product–market-fit chart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis dataKey="label" fontSize={11} tickLine={false} />
              <YAxis
                fontSize={11}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="Left"
                name="Members left teams"
                fill={CHART_COLORS.negative}
                fillOpacity={0.7}
                radius={[4, 4, 0, 0]}
              />
              <Line
                dataKey="Reporting"
                name="Students reporting"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={{ r: 2.5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Who left, and how they felt before leaving</CardTitle>
          <CardDescription>
            {data.leavers.length} departures — last three sentiment scores
            before the exit, oldest to newest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72">
            <div className="space-y-1 pr-4">
              {data.leavers.map((l, i) => (
                <div
                  key={`${l.user_id}-${i}`}
                  className="flex items-center gap-2 rounded border px-3 py-2"
                >
                  <span className="truncate text-sm font-medium">
                    {l.user_name ?? "Unknown"}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {l.team_name}
                  </span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {l.weeks_reported} wks · left {formatWeek(l.left_at)}
                  </span>
                  <div className="flex gap-1">
                    {l.last_scores.length === 0 && (
                      <span className="text-muted-foreground text-xs">
                        never reported
                      </span>
                    )}
                    {l.last_scores.map((s, j) => (
                      <ScoreBadge key={j} score={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <ProgramAccountability active={active} />
    </div>
  );
}
