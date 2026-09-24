"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBatches } from "@/components/diplomas/use-diplomas";
import { alignBatches } from "@/lib/analytics/compare";
import { ChartTooltip } from "../chart-tooltip";
import { CHART_COLORS, SERIES_COLORS } from "../types";
import { useOutcomes } from "../use-analytics";

interface Props {
  active: boolean;
  batchId: string | null;
}

type Metric = "active_pct" | "completion_pct" | "sentiment" | "reports";
const METRICS: { value: Metric; label: string; domain?: [number, number] }[] = [
  { value: "active_pct", label: "Active students %", domain: [0, 100] },
  {
    value: "completion_pct",
    label: "My Journey completion %",
    domain: [0, 100],
  },
  { value: "sentiment", label: "Sentiment (1–10)", domain: [0, 10] },
  { value: "reports", label: "Weekly reports submitted" },
];

/** Two cohorts on the same programme-week axis. */
export function BatchCompare({ active, batchId }: Props) {
  const { data: batches = [] } = useBatches(active);
  const closed = batches.filter((b) => b.closed_at && b.id !== batchId);
  const [other, setOther] = useState<string | null>(null);
  const batchB = other ?? closed[0]?.id ?? null;
  const [metric, setMetric] = useState<Metric>("active_pct");
  const q = useOutcomes(batchId, batchB === batchId ? null : batchB, active);

  const rows = useMemo(() => {
    if (!q.data) return [];
    const a =
      "weeks" in q.data.a && q.data.a.weeks.length
        ? (q.data.a as { weeks: never[] })
        : null;
    return alignBatches(a as never, q.data.b).map((r) => ({
      label: `W${r.week}`,
      A: r[`a_${metric}` as keyof typeof r] as number | null,
      B: r[`b_${metric}` as keyof typeof r] as number | null,
    }));
  }, [q.data, metric]);

  const nameA = q.data && "name" in q.data.a ? q.data.a.name : "This scope";
  const nameB = q.data?.b?.name ?? null;
  const meta = METRICS.find((m) => m.value === metric)!;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div>
          <CardTitle>Batch versus batch</CardTitle>
          <CardDescription>
            Same programme week, side by side. Pick the metric and the cohort to
            compare against.
            {!batchId &&
              " Select a single batch in the scope picker to compare."}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <SelectTrigger className="w-56" aria-label="Metric">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={batchB ?? "none"}
            onValueChange={(v) => setOther(v === "none" ? null : v)}
          >
            <SelectTrigger className="w-56" aria-label="Compare with">
              <SelectValue placeholder="Compare with…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No comparison</SelectItem>
              {closed.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Fills in after the cohort&apos;s first programme week.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={rows}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis dataKey="label" fontSize={11} tickLine={false} />
              <YAxis
                domain={meta.domain}
                allowDecimals={metric === "sentiment"}
                fontSize={11}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Line
                dataKey="A"
                name={nameA}
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              {nameB && (
                <Line
                  dataKey="B"
                  name={nameB}
                  stroke={SERIES_COLORS[2]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  strokeDasharray="4 3"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
