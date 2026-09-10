import { Minus, TrendingDown, TrendingUp } from "lucide-react";

/** Small "+12 / -3 / 0" delta shown under a leaderboard metric. */
export function ChangeValue({ value }: { value: number }) {
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
      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <TrendingUp className="h-3 w-3" />
        <span className="tabular-nums">+{value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
      <TrendingDown className="h-3 w-3" />
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
