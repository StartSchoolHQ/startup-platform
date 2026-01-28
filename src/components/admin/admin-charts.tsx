"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
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

const TASK_STATUS_COLORS = {
  completed: "#10b981",
  in_progress: "#f59e0b",
  pending_review: "#06b6d4",
  not_started: "#6b7280",
};

export function AdminCharts({
  meetings,
  strikes,
  reports,
  tasksByStatus,
  teamPoints,
  teamXp,
}: AdminChartsProps) {
  // Team points data (top 10, exclude teams with 0 points)
  const teamPointsData = teamPoints
    .filter((team) => team.team_points > 0)
    .map((team) => ({
      name: team.name,
      value: team.team_points,
    }));

  // Team XP data (top 10, exclude teams with 0 XP)
  const teamXpData = teamXp
    .filter((team) => (team.total_xp || 0) > 0)
    .map((team) => ({
      name: team.name,
      value: team.total_xp || 0,
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Team Points Distribution */}
      {teamPointsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team Points Distribution (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={teamPointsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {teamPointsData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Team XP Distribution */}
      {teamXpData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team XP Distribution (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={teamXpData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {teamXpData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
