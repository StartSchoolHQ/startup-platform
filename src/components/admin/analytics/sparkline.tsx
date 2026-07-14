"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { CHART_COLORS } from "./types";

interface Props {
  points: { label: string; value: number | null }[];
  color?: string;
  height?: number;
}

export function Sparkline({
  points,
  color = CHART_COLORS.primary,
  height = 36,
}: Props) {
  if (points.length < 2) {
    return (
      <div
        className="text-muted-foreground flex items-center text-xs"
        style={{ height }}
      >
        not enough data
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points}>
        <YAxis domain={[1, 10]} hide />
        <Line
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
