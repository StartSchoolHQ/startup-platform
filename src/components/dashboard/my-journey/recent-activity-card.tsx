import { History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/date-utils";
import { economyLabels } from "@/lib/economy-labels";
import { MyJourneyActivityEntry } from "@/types/dashboard";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";

const labels = economyLabels("my_journey");

function Amount({ value, unit }: { value: number; unit: string }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span
      className={cn(
        "text-sm font-semibold tabular-nums",
        positive
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400"
      )}
    >
      {positive ? "+" : ""}
      {value.toLocaleString()}{" "}
      <span className="text-muted-foreground text-xs font-normal">{unit}</span>
    </span>
  );
}

/** Last few solo-economy transactions, same row language as the Transactions page. */
export function RecentActivityCard({
  entries,
}: {
  entries: MyJourneyActivityEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b px-5 py-3">
        <SectionLabel icon={History} title="Recent activity" />
      </div>
      <ul className="divide-y">
        {entries.map((entry, index) => (
          <li
            key={`${entry.created_at}-${index}`}
            className="flex items-center gap-4 px-5 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {entry.description || entry.type.replace(/_/g, " ")}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {formatRelativeTime(entry.created_at)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-4">
              <Amount value={entry.xp_change ?? 0} unit={labels.xp} />
              <Amount value={entry.points_change ?? 0} unit={labels.points} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
