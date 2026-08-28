import { Minus, TrendingDown, TrendingUp } from "lucide-react";

const changeColorMap = {
  green: "text-green-500",
  blue: "text-blue-500",
  yellow: "text-yellow-500",
  purple: "text-purple-500",
} as const;

/** Small "+12 / -3 / 0" delta shown under a leaderboard metric. */
export function ChangeValue({
  value,
  color,
}: {
  value: number;
  color: "green" | "blue" | "yellow" | "purple";
}) {
  if (value === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <Minus className="h-3 w-3" />
        <span>0</span>
      </div>
    );
  }
  if (value > 0) {
    return (
      <div
        className={`flex items-center gap-1 text-xs ${changeColorMap[color]}`}
      >
        <TrendingUp className="h-3 w-3" />
        <span>+{value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs text-red-500">
      <TrendingDown className="h-3 w-3" />
      <span>{value}</span>
    </div>
  );
}
