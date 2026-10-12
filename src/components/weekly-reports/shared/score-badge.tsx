import { cn } from "@/lib/utils";
import { scoreTone } from "./pickers";

const TONE_DOT = {
  low: "bg-red-500",
  mid: "bg-amber-500",
  high: "bg-green-500",
};

/** "7/10" with a mood dot on the shared thresholds; a dash when unscored. */
export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm tabular-nums">
      <span
        aria-hidden
        className={cn("h-2 w-2 rounded-full", TONE_DOT[scoreTone(score)])}
      />
      <span className="font-medium">{score}</span>
      <span className="text-muted-foreground">/10</span>
    </span>
  );
}
