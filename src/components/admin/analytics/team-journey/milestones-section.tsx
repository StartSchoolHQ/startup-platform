"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartTooltip } from "../chart-tooltip";
import { CHART_COLORS } from "../types";
import { useMilestones } from "../use-analytics";

interface Props {
  active: boolean;
  batchId: string | null;
}

/** Customer conversations per programme week and revenue per team. */
export function MilestonesSection({ active, batchId }: Props) {
  const q = useMilestones(batchId, active);
  if (q.isLoading) return <Skeleton className="h-72 w-full" />;
  if (q.isError || !q.data) return null;
  const weekly = q.data.meetings_weekly.map((w) => ({
    label: `W${w.week}`,
    Meetings: w.meetings,
    "Willing to pay": w.willingness_to_pay,
  }));
  const teams = q.data.by_team;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Customer conversations</CardTitle>
          <CardDescription>
            Completed client meetings per programme week, and how many ended
            with willingness to pay.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weekly.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Fills in when a team logs its first client meeting.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weekly}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="label" fontSize={11} tickLine={false} />
                <YAxis
                  allowDecimals={false}
                  fontSize={11}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="Meetings"
                  fill={CHART_COLORS.primary}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="Willing to pay"
                  fill={CHART_COLORS.positive}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestones per team</CardTitle>
          <CardDescription>
            Meetings, interest funnel and revenue streams. MRR is the sum of
            open streams; the badge marks verified revenue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Fills in when the batch has teams.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Meetings</TableHead>
                  <TableHead className="text-right">Pay / Try / No</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((t) => (
                  <TableRow key={t.team_id}>
                    <TableCell className="font-medium">
                      {t.team_name}
                      {t.team_status !== "active" && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({t.team_status})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.meetings}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.willingness_to_pay} / {t.intent_to_try} /{" "}
                      {t.not_interested}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.revenue_streams === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          €{Number(t.mrr).toLocaleString("en-GB")}
                          {Number(t.verified_mrr) > 0 && (
                            <Badge
                              variant="outline"
                              className="text-emerald-700"
                            >
                              verified
                            </Badge>
                          )}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
