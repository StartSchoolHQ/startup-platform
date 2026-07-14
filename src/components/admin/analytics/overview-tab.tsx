"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAnalyticsOverview } from "./use-analytics";
import { SentimentChart } from "./sentiment-chart";
import { WeekDetailSheet } from "./week-detail-sheet";
import { AiPlaceholderCard, TabError, TabSkeleton, TrendIcon } from "./shared";
import { toNum } from "./types";

function KpiCard({
  title,
  value,
  sub,
  trend,
}: {
  title: string;
  value: string;
  sub: string;
  trend?: number | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-2xl">
          {value}
          {trend !== undefined && <TrendIcon delta={trend} />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-xs">{sub}</p>
      </CardContent>
    </Card>
  );
}

export function OverviewTab({ active }: { active: boolean }) {
  const { data, isLoading, isError, refetch } = useAnalyticsOverview(active);
  const [weekStart, setWeekStart] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!data || data.length === 0) return null;
    // Drop the current, still-incomplete week from aggregates and the chart
    const weeks = data.length > 1 ? data.slice(0, -1) : data;
    const last = weeks[weeks.length - 1];
    const prev = weeks.length > 1 ? weeks[weeks.length - 2] : null;
    const lastAvg = toNum(last.avg_score);
    const prevAvg = prev ? toNum(prev.avg_score) : null;
    const participation =
      last.expected_reporters > 0
        ? Math.round((last.reports / last.expected_reporters) * 100)
        : 0;
    const commitmentRate =
      last.commitments_total > 0
        ? Math.round(
            (last.commitments_completed / last.commitments_total) * 100
          )
        : 0;
    return {
      weeks,
      lastAvg,
      delta: lastAvg != null && prevAvg != null ? lastAvg - prevAvg : null,
      participation,
      commitmentRate,
      lowScores: last.low_scores,
      blockers: last.real_blockers,
      label: last.week_start,
    };
  }, [data]);

  if (isLoading) return <TabSkeleton />;
  if (isError || !stats) {
    return (
      <TabError
        message="Could not load overview analytics."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          title="Avg sentiment (last full week)"
          value={stats.lastAvg?.toFixed(1) ?? "—"}
          sub={
            stats.delta != null
              ? `${stats.delta >= 0 ? "+" : ""}${stats.delta.toFixed(1)} vs previous week`
              : "no previous week"
          }
          trend={stats.delta}
        />
        <KpiCard
          title="Participation"
          value={`${stats.participation}%`}
          sub="of expected students reported"
        />
        <KpiCard
          title="Commitments completed"
          value={`${stats.commitmentRate}%`}
          sub="of what they promised last week"
        />
        <KpiCard
          title="Struggling signals"
          value={`${stats.lowScores}`}
          sub={`scores ≤ 4 · ${stats.blockers} real blockers reported`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How students felt over time</CardTitle>
          <CardDescription>
            Weekly alignment score across the whole program
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SentimentChart weeks={stats.weeks} onWeekClick={setWeekStart} />
        </CardContent>
      </Card>

      <AiPlaceholderCard />

      <WeekDetailSheet
        weekStart={weekStart}
        onClose={() => setWeekStart(null)}
      />
    </div>
  );
}
