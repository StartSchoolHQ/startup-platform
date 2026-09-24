"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
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
  pace: MyJourneyData["pace"];
  phasesTotal: number;
}

/**
 * Cohort median phase per programme week (line) with every student's current
 * phase as a dot on the latest week. Behind = below the line.
 */
export function PaceChart({ pace, phasesTotal }: Props) {
  const data = pace.map((p) => ({
    label: `W${p.week}`,
    week: p.week,
    median: p.median_phase,
  }));
  const latest = pace[pace.length - 1];
  const points = (latest?.points ?? []).map((pt, i) => ({
    label: `W${latest.week}`,
    phase: pt.phase + (i % 3) * 0.08 - 0.08, // tiny jitter so dots don't stack
    user_id: pt.user_id,
  }));
  const hasData = data.length > 0 && data.some((d) => d.median !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pace</CardTitle>
        <CardDescription>
          Cohort median phase per programme week. Dots are individual students
          this week.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Fills in after the first week with students in the cohort.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="label"
                fontSize={11}
                tickLine={false}
                allowDuplicatedCategory={false}
              />
              <YAxis
                domain={[1, Math.max(2, phasesTotal)]}
                allowDecimals={false}
                fontSize={11}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                dataKey="median"
                name="Cohort median phase"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Scatter
                data={points}
                dataKey="phase"
                name="Student"
                fill={CHART_COLORS.warning}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
