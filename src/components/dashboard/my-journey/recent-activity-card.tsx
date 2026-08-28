import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/date-utils";
import { economyLabels } from "@/lib/economy-labels";
import { MyJourneyActivityEntry } from "@/types/dashboard";

const labels = economyLabels("my_journey");

function signed(amount: number): string {
  return amount > 0 ? `+${amount}` : `${amount}`;
}

/** Signed amount per unit, joined with a dot, skipping the zero halves. */
function amountText(entry: MyJourneyActivityEntry): string {
  const parts: string[] = [];
  const xp = entry.xp_change ?? 0;
  const points = entry.points_change ?? 0;

  if (xp !== 0) parts.push(`${signed(xp)} ${labels.xp}`);
  if (points !== 0) parts.push(`${signed(points)} ${labels.points}`);

  return parts.join(" · ");
}

export function RecentActivityCard({
  entries,
}: {
  entries: MyJourneyActivityEntry[];
}) {
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <History className="text-primary h-5 w-5" />
        <CardTitle className="text-lg">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {entries.map((entry, index) => {
            const amount = amountText(entry);
            const isNegative =
              (entry.xp_change ?? 0) < 0 || (entry.points_change ?? 0) < 0;

            return (
              <li
                key={`${entry.created_at}-${index}`}
                className="flex flex-wrap items-baseline gap-x-2 text-sm"
              >
                {amount && (
                  <span
                    className={
                      isNegative
                        ? "text-muted-foreground font-medium"
                        : "font-medium text-emerald-600 dark:text-emerald-400"
                    }
                  >
                    {amount}
                  </span>
                )}
                {entry.description && (
                  <span className="text-muted-foreground">
                    {amount && "· "}
                    {entry.description}
                  </span>
                )}
                <span className="text-muted-foreground text-xs">
                  · {formatRelativeTime(entry.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
