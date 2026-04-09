"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";

interface TeamData {
  id: string;
  name: string;
  team_points: number;
  total_xp?: number;
}

interface AdminChartsProps {
  teamPoints: TeamData[];
  teamXp: TeamData[];
}

const COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background rounded-lg border p-2 shadow-sm">
        <p className="text-sm font-medium">{payload[0].payload.fullName}</p>
        <p className="text-muted-foreground text-sm">
          {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function AdminCharts({ teamPoints, teamXp }: AdminChartsProps) {
  const teamPointsData = teamPoints
    .filter((team) => team.team_points > 0)
    .sort((a, b) => a.team_points - b.team_points)
    .map((team) => ({
      name: team.name.length > 20 ? team.name.slice(0, 20) + "…" : team.name,
      fullName: team.name,
      value: team.team_points,
    }));

  const teamXpData = teamXp
    .filter((team) => (team.total_xp || 0) > 0)
    .sort((a, b) => (a.total_xp || 0) - (b.total_xp || 0))
    .map((team) => ({
      name: team.name.length > 20 ? team.name.slice(0, 20) + "…" : team.name,
      fullName: team.name,
      value: team.total_xp || 0,
    }));

  const barHeight = 34;
  const hasChartData = teamPointsData.length > 0 || teamXpData.length > 0;

  if (!hasChartData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12">
          <BarChart3 className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            No team data to chart yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {teamPointsData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team Points (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={teamPointsData.length * barHeight + 20}
            >
              <BarChart
                data={teamPointsData}
                layout="vertical"
                margin={{ left: 10, right: 50, top: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v) => Number(v).toLocaleString()}
                    style={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  {teamPointsData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {teamXpData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team XP (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={teamXpData.length * barHeight + 20}
            >
              <BarChart
                data={teamXpData}
                layout="vertical"
                margin={{ left: 10, right: 50, top: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v) => Number(v).toLocaleString()}
                    style={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  {teamXpData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
