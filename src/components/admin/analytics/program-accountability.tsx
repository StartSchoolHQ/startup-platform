"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalyticsEconomy, useAnalyticsStrikes } from "./use-analytics";
import { ChartTooltip } from "./chart-tooltip";
import { CHART_COLORS, formatWeek } from "./types";

export function ProgramAccountability({ active }: { active: boolean }) {
  const strikes = useAnalyticsStrikes(active);
  const economy = useAnalyticsEconomy(active);

  if (strikes.isLoading || economy.isLoading) {
    return <Skeleton className="h-72 w-full" />;
  }
  if (!strikes.data || !economy.data) return null;

  const strikesWeekly = strikes.data.weekly.map((w) => ({
    label: formatWeek(w.week_start),
    Strikes: w.strikes,
    Resolved: w.resolved,
  }));
  const economyWeekly = economy.data.weekly.map((w) => ({
    label: formatWeek(w.week_start),
    "Points earned": w.points_earned,
    "Points lost": w.points_lost,
  }));
  const pen = economy.data.penalties;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Missed-report strikes</CardTitle>
          <CardDescription>
            {strikes.data.by_team.length} teams hit at least one strike — worst
            offenders:{" "}
            {strikes.data.by_team
              .slice(0, 3)
              .map((t) => `${t.team_name} (${t.strikes})`)
              .join(", ")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={strikesWeekly}>
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
                dataKey="Strikes"
                fill={CHART_COLORS.warning}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Resolved"
                fill={CHART_COLORS.positive}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div>
            <p className="mb-2 text-sm font-medium">Latest excuses, verbatim</p>
            <ScrollArea className="h-40">
              <div className="space-y-2 pr-4">
                {strikes.data.recent_explanations.map((e, i) => (
                  <div key={i} className="rounded border p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{e.team_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {e.status}
                      </Badge>
                      <span className="text-muted-foreground ml-auto text-xs">
                        {formatWeek(e.created_at)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs italic">
                      &ldquo;{e.explanation}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Points economy</CardTitle>
          <CardDescription>
            {pen.users_penalized} students lost{" "}
            {pen.points_lost_to_penalties.toLocaleString()} points across{" "}
            {pen.penalty_count} missed-report penalties ({pen.refund_count}{" "}
            refunded)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={economyWeekly}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis dataKey="label" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} tickLine={false} width={44} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                dataKey="Points earned"
                stroke={CHART_COLORS.positive}
                fill={CHART_COLORS.positive}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                dataKey="Points lost"
                stroke={CHART_COLORS.negative}
                fill={CHART_COLORS.negative}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="space-y-1">
            {economy.data.by_type.map((t) => (
              <div
                key={t.type}
                className="text-muted-foreground flex items-center justify-between text-xs"
              >
                <span>{t.type.replace(/_/g, " ")}</span>
                <span>
                  {t.count.toLocaleString()} tx · {t.xp.toLocaleString()} XP ·{" "}
                  {t.points.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
