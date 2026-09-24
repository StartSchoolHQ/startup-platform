"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartTooltip } from "../chart-tooltip";
import { CHART_COLORS } from "../types";
import type { MyJourneyData } from "../types";

interface Props {
  weekly: MyJourneyData["weekly"];
}

export function WeeklyActivity({ weekly }: Props) {
  const data = weekly.map((w) => ({
    label: `W${w.week}`,
    "Active %": w.active_pct,
    Completions: w.completions,
    Sentiment: w.sentiment,
  }));
  const hasData = data.some((d) => d["Active %"] > 0 || d.Completions > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly activity</CardTitle>
        <CardDescription>
          Share of students active each week, tasks approved, and the solo
          weekly-report sentiment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!hasData ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Fills in with the first sign-in or task start.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={data}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="label" fontSize={11} tickLine={false} />
                <YAxis
                  yAxisId="pct"
                  domain={[0, 100]}
                  fontSize={11}
                  tickLine={false}
                  width={32}
                />
                <YAxis
                  yAxisId="n"
                  orientation="right"
                  allowDecimals={false}
                  fontSize={11}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  yAxisId="pct"
                  dataKey="Active %"
                  fill={CHART_COLORS.primary}
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  yAxisId="n"
                  dataKey="Completions"
                  stroke={CHART_COLORS.positive}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={140}>
              <ComposedChart data={data}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="label" fontSize={11} tickLine={false} />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 5, 10]}
                  fontSize={11}
                  tickLine={false}
                  width={32}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  dataKey="Sentiment"
                  stroke={CHART_COLORS.warning}
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
