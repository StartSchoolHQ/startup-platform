"use client";

import {
  ComposedChart,
  BarChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import { CHART_COLORS, formatWeek, toNum } from "./types";
import type { OverviewWeek } from "./types";

interface Props {
  weeks: OverviewWeek[];
  onWeekClick: (weekStart: string) => void;
}

/**
 * Two stacked charts sharing the same x-axis (weeks): sentiment on a 1–10
 * scale, participation as a percentage below it. Deliberately NOT a
 * dual-axis chart. Clicking either chart drills into that week.
 */
export function SentimentChart({ weeks, onWeekClick }: Props) {
  const data = weeks.map((w) => {
    const min = w.min_score ?? 0;
    const max = w.max_score ?? 0;
    return {
      weekStart: w.week_start,
      label: formatWeek(w.week_start),
      avg: toNum(w.avg_score),
      // band is rendered as stacked areas: transparent base + visible range
      bandBase: min,
      bandRange: Math.max(0, max - min),
      participation:
        w.expected_reporters > 0
          ? Math.min(100, Math.round((w.reports / w.expected_reporters) * 100))
          : 0,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (state: any) => {
    const idx = state?.activeTooltipIndex;
    if (typeof idx === "number" && data[idx]) {
      onWeekClick(data[idx].weekStart);
    }
  };

  return (
    <div className="space-y-1">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={data}
          onClick={handleClick}
          className="cursor-pointer"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" fontSize={11} tickLine={false} />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            fontSize={11}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            dataKey="bandBase"
            stackId="band"
            stroke="none"
            fill="transparent"
            name="Lowest score"
            activeDot={false}
          />
          <Area
            dataKey="bandRange"
            stackId="band"
            stroke="none"
            fill={CHART_COLORS.primary}
            fillOpacity={0.12}
            name="Score range"
            activeDot={false}
            tooltipType="none"
          />
          <Line
            dataKey="avg"
            name="Avg sentiment"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={{ r: 2.5 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={90}>
        <BarChart data={data} onClick={handleClick} className="cursor-pointer">
          <XAxis dataKey="label" hide />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 100]}
            fontSize={10}
            tickLine={false}
            width={28}
            unit="%"
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            dataKey="participation"
            name="Participation %"
            fill={CHART_COLORS.neutral}
            fillOpacity={0.7}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-muted-foreground text-center text-xs">
        Avg weekly sentiment (top, 1–10 with min–max band) and report
        participation (bottom). Click a week to see who felt what and why.
      </p>
    </div>
  );
}
