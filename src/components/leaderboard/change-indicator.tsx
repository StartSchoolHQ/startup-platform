import { ArrowUp, ArrowDown } from "lucide-react";

interface ChangeIndicatorProps {
  direction: "up" | "down" | "none";
  amount: number;
}

export function ChangeIndicator({ direction, amount }: ChangeIndicatorProps) {
  if (direction === "none" || amount === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {direction === "up" ? (
        <ArrowUp className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
      ) : (
        <ArrowDown className="h-3 w-3 text-destructive" />
      )}
      <span
        className={`text-sm ${
          direction === "up"
            ? "text-emerald-500 dark:text-emerald-400"
            : "text-destructive"
        }`}
      >
        {amount}
      </span>
    </div>
  );
}
