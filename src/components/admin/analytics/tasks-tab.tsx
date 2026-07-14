"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalyticsTasks } from "./use-analytics";
import { ChartTooltip } from "./chart-tooltip";
import { TabError, TabSkeleton } from "./shared";
import { CHART_COLORS, formatWeek } from "./types";

const STATUS_META: Record<string, { label: string; color: string }> = {
  approved: { label: "Approved", color: CHART_COLORS.positive },
  pending_review: { label: "Pending review", color: CHART_COLORS.warning },
  in_progress: { label: "In progress", color: CHART_COLORS.primary },
  not_started: { label: "Not started", color: CHART_COLORS.neutral },
  rejected: { label: "Rejected", color: CHART_COLORS.negative },
};

export function TasksTab({ active }: { active: boolean }) {
  const { data, isLoading, isError, refetch } = useAnalyticsTasks(active);

  if (isLoading) return <TabSkeleton />;
  if (isError || !data) {
    return (
      <TabError
        message="Could not load task analytics."
        onRetry={() => refetch()}
      />
    );
  }

  const topTasks = data.top_tasks.map((t) => ({
    ...t,
    shortTitle: t.title.length > 38 ? `${t.title.slice(0, 36)}…` : t.title,
  }));
  const funnel = data.status_funnel.map((s) => ({
    ...s,
    label: STATUS_META[s.status]?.label ?? s.status,
    color: STATUS_META[s.status]?.color ?? CHART_COLORS.neutral,
  }));
  const weekly = data.weekly_completions.map((w) => ({
    label: formatWeek(w.week_start),
    Completions: w.completions,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most completed tasks</CardTitle>
            <CardDescription>Top 15 by approved completions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={430}>
              <BarChart data={topTasks} layout="vertical">
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="shortTitle"
                  width={210}
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="completions"
                  name="Completions"
                  fill={CHART_COLORS.primary}
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task pipeline</CardTitle>
              <CardDescription>
                Where all {funnel.reduce((a, s) => a + s.count, 0)} task
                assignments stand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {funnel.map((s) => {
                const total = funnel.reduce((a, x) => a + x.count, 0);
                const pct = total ? Math.round((s.count / total) * 100) : 0;
                return (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className="w-32 text-sm">{s.label}</span>
                    <div className="bg-muted h-5 flex-1 overflow-hidden rounded">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                    <span className="w-20 text-right text-sm font-medium">
                      {s.count} · {pct}%
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completions over time</CardTitle>
              <CardDescription>Approved tasks per week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={weekly}>
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
                  <Area
                    dataKey="Completions"
                    stroke={CHART_COLORS.positive}
                    fill={CHART_COLORS.positive}
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
