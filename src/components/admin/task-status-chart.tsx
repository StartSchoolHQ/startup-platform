"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TasksByStatus {
  completed: number;
  in_progress: number;
  pending_review: number;
  not_started: number;
}

interface TaskStatusChartProps {
  data: TasksByStatus;
}

const STATUS_CONFIG = [
  { key: "completed", label: "Approved", color: "#10b981" },
  { key: "in_progress", label: "In Progress", color: "#6366f1" },
  { key: "pending_review", label: "Pending Review", color: "#f59e0b" },
  { key: "not_started", label: "Not Started", color: "#94a3b8" },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background rounded-lg border p-2.5 shadow-md">
        <div className="flex items-center gap-2 text-sm">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: payload[0].payload.fill }}
          />
          <span className="font-medium">{payload[0].name}</span>
          <span className="text-muted-foreground">{payload[0].value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export function TaskStatusChart({ data }: TaskStatusChartProps) {
  const total =
    data.completed + data.in_progress + data.pending_review + data.not_started;

  if (total === 0) return null;

  const chartData = STATUS_CONFIG.map((s) => ({
    name: s.label,
    value: data[s.key],
    fill: s.color,
  })).filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Task Pipeline</CardTitle>
        <p className="text-muted-foreground text-xs">
          {total} total task assignments
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col gap-2.5">
            {STATUS_CONFIG.map((s) => {
              const value = data[s.key];
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div
                  key={s.key}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-muted-foreground text-sm">
                      {s.label}
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {value}{" "}
                    <span className="text-muted-foreground text-xs">
                      ({pct}%)
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
