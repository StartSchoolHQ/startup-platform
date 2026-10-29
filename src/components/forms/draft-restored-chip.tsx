import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";

/** "just now" under a minute, "N min ago" under an hour, else date-fns. */
function savedAgo(at: Date | string): string {
  const date = new Date(at);
  const minutes = Number(
    formatDistanceToNowStrict(date, {
      unit: "minute",
      roundingMethod: "floor",
    }).split(" ")[0]
  );
  if (!Number.isFinite(minutes) || minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

/**
 * Header chip shown when a form opened from a saved draft. Without a known
 * save time it reads just "Draft restored".
 */
export function DraftRestoredChip({
  savedAt,
  className,
}: {
  savedAt?: Date | string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-muted text-muted-foreground inline-flex w-fit rounded-full px-2 py-0.5 text-xs",
        className
      )}
    >
      Draft restored{savedAt ? ` · saved ${savedAgo(savedAt)}` : ""}
    </span>
  );
}
