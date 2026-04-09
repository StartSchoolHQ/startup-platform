"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface WeeklyTrend {
  week_number: number;
  week_year: number;
  week_label: string;
  report_submissions: number;
  tasks_completed: number;
  active_students: number;
}

interface WeeklyTrendsChartProps {
  data: WeeklyTrend[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background rounded-lg border p-3 shadow-md">
        <p className="mb-1.5 text-sm font-semibold">{label}</p>
        {payload.map(
          (
            entry: { name: string; value: number; color: string },
            idx: number
          ) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{entry.value}</span>
            </div>
          )
        )}
      </div>
    );
  }
  return null;
};

export function WeeklyTrendsChart({ data }: WeeklyTrendsChartProps) {
  // Skip the current (incomplete) week for a cleaner chart
  const chartData = data.slice(0, -1).map((d) => ({
    ...d,
    week_label: d.week_label,
  }));

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Weekly Activity Trends</CardTitle>
        <p className="text-muted-foreground text-xs">
          Report submissions and task completions per week
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="reportGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="week_label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="report_submissions"
              name="Reports"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#reportGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="tasks_completed"
              name="Tasks Completed"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#taskGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-2 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-xs">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <span className="text-muted-foreground">Reports</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Tasks Completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
