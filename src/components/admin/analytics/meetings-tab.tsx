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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalyticsMeetings } from "./use-analytics";
import { ChartTooltip } from "./chart-tooltip";
import { TabError, TabSkeleton } from "./shared";
import { CHART_COLORS, formatWeek } from "./types";

const INTEREST_META: Record<string, { label: string; color: string }> = {
  willingness_to_pay: { label: "Willing to pay", color: CHART_COLORS.positive },
  intent_to_try: { label: "Intent to try", color: CHART_COLORS.primary },
  introductions: { label: "Introductions", color: CHART_COLORS.warning },
  not_interested: { label: "Not interested", color: CHART_COLORS.negative },
  unknown: { label: "Not recorded", color: CHART_COLORS.neutral },
};

export function MeetingsTab({ active }: { active: boolean }) {
  const { data, isLoading, isError, refetch } = useAnalyticsMeetings(active);

  if (isLoading) return <TabSkeleton />;
  if (isError || !data) {
    return (
      <TabError
        message="Could not load meeting analytics."
        onRetry={() => refetch()}
      />
    );
  }

  const weekly = data.weekly.map((w) => ({
    label: formatWeek(w.week_start),
    Meetings: w.meetings,
    "Willing to pay": w.willingness_to_pay,
  }));
  const funnelTotal = data.interest_funnel.reduce((a, f) => a + f.count, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer meetings over time</CardTitle>
            <CardDescription>
              Completed client meetings per week, with how many reached
              willingness to pay
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weekly}>
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
                  dataKey="Meetings"
                  fill={CHART_COLORS.primary}
                  fillOpacity={0.35}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Willing to pay"
                  fill={CHART_COLORS.positive}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validation funnel</CardTitle>
            <CardDescription>
              Outcome of all {funnelTotal} completed customer meetings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.interest_funnel.map((f) => {
              const meta = INTEREST_META[f.level] ?? INTEREST_META.unknown;
              const pct = funnelTotal
                ? Math.round((f.count / funnelTotal) * 100)
                : 0;
              return (
                <div key={f.level} className="flex items-center gap-3">
                  <span className="w-32 text-sm">{meta.label}</span>
                  <div className="bg-muted h-5 flex-1 overflow-hidden rounded">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: meta.color,
                      }}
                    />
                  </div>
                  <span className="w-20 text-right text-sm font-medium">
                    {f.count} · {pct}%
                  </span>
                </div>
              );
            })}
            <p className="text-muted-foreground pt-2 text-xs">
              Willingness to pay is the strongest validation signal a beta team
              can produce.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meetings per team</CardTitle>
            <CardDescription>
              Customer-contact intensity — teams doing zero validation are
              flying blind
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-1 pr-4">
                {data.by_team.map((t) => (
                  <div
                    key={t.team_id}
                    className="flex items-center gap-2 rounded border px-3 py-2"
                  >
                    <span className="truncate text-sm font-medium">
                      {t.team_name}
                    </span>
                    {t.team_status === "archived" && (
                      <Badge variant="secondary" className="text-xs">
                        archived
                      </Badge>
                    )}
                    <span className="text-muted-foreground ml-auto text-xs">
                      last {t.last_meeting ? formatWeek(t.last_meeting) : "—"}
                    </span>
                    <Badge variant="outline">{t.meetings}</Badge>
                    {t.willingness_to_pay > 0 && (
                      <Badge
                        className="text-white"
                        style={{ backgroundColor: CHART_COLORS.positive }}
                      >
                        {t.willingness_to_pay} paying
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What teams learned from customers</CardTitle>
            <CardDescription>
              Latest recorded learnings, in the teams&apos; own words
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3 pr-4">
                {data.learnings.map((l, i) => {
                  const meta = l.interest_level
                    ? INTEREST_META[l.interest_level]
                    : null;
                  return (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {l.team_name}
                        </span>
                        {meta && (
                          <Badge
                            variant="outline"
                            style={{ color: meta.color }}
                          >
                            {meta.label}
                          </Badge>
                        )}
                        <span className="text-muted-foreground ml-auto text-xs">
                          {formatWeek(l.meeting_date)}
                        </span>
                      </div>
                      {l.main_learnings && (
                        <p className="text-muted-foreground mt-1.5 text-sm italic">
                          &ldquo;{l.main_learnings}&rdquo;
                        </p>
                      )}
                      {l.client_feedback && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Client said: {l.client_feedback}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
