import { formatDistanceToNowStrict } from "date-fns";

/** "just now" under a minute, "N min ago" under an hour, else date-fns. */
function savedAgo(iso: string): string {
  const date = new Date(iso);
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

/** Header chip shown when the form opened from a saved draft. */
export function TaskSubmissionDraftChip({ savedAt }: { savedAt: string }) {
  return (
    <span className="bg-muted text-muted-foreground inline-flex w-fit rounded-full px-2 py-0.5 text-xs">
      Draft restored · saved {savedAgo(savedAt)}
    </span>
  );
}
