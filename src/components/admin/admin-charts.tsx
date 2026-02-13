"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

interface TasksByStatus {
  completed: number;
  in_progress: number;
  pending_review: number;
  not_started: number;
}

interface TeamData {
  id: string;
  name: string;
  team_points: number;
  total_xp?: number;
}

interface AdminChartsProps {
  meetings: number;
  strikes: number;
  reports: number;
  tasksByStatus: TasksByStatus;
  teamPoints: TeamData[];
  teamXp: TeamData[];
}

const COLORS = [
  "#4f46e5", // indigo
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo-500
];

export function AdminCharts({ teamPoints, teamXp }: AdminChartsProps) {
  // Team points data (top 10, exclude teams with 0 points), sorted ascending for horizontal bars
  const teamPointsData = teamPoints
    .filter((team) => team.team_points > 0)
    .sort((a, b) => a.team_points - b.team_points)
    .map((team) => ({
      name: team.name.length > 25 ? team.name.slice(0, 25) + "…" : team.name,
      fullName: team.name,
      value: team.team_points,
    }));

  // Team XP data (top 10, exclude teams with 0 XP), sorted ascending for horizontal bars
  const teamXpData = teamXp
    .filter((team) => (team.total_xp || 0) > 0)
    .sort((a, b) => (a.total_xp || 0) - (b.total_xp || 0))
    .map((team) => ({
      name: team.name.length > 25 ? team.name.slice(0, 25) + "…" : team.name,
      fullName: team.name,
      value: team.total_xp || 0,
    }));

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

  const barHeight = 36;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Team Points */}
      {teamPointsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team Points (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={teamPointsData.length * barHeight + 40}
            >
              <BarChart
                data={teamPointsData}
                layout="vertical"
                margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
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

      {/* Team XP */}
      {teamXpData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team XP (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={teamXpData.length * barHeight + 40}
            >
              <BarChart
                data={teamXpData}
                layout="vertical"
                margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
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
