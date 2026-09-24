"use client";

import { format, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityRow } from "@/lib/activity/format";
import { ActivityRowItem } from "./activity-row";

interface Props {
  rows: ActivityRow[];
  isLoading: boolean;
  isError: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMMM yyyy");
}

/** Rows grouped by calendar day (viewer's time zone), newest day first. */
export function groupByDay(rows: ActivityRow[]): [string, ActivityRow[]][] {
  const groups = new Map<string, ActivityRow[]>();
  for (const row of rows) {
    const key = format(new Date(row.occurred_at), "yyyy-MM-dd");
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()].map(([, list]) => [
    dayLabel(list[0].occurred_at),
    list,
  ]);
}

export function ActivityList({
  rows,
  isLoading,
  isError,
  hasMore,
  loadingMore,
  onLoadMore,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <p className="text-destructive text-sm">
        Couldn&apos;t load the activity feed. Refresh the page.
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Nothing matches these filters.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {groupByDay(rows).map(([label, list]) => (
        <section key={label}>
          <h3 className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            {label}
          </h3>
          <Separator />
          <div className="divide-y">
            {list.map((row) => (
              <ActivityRowItem key={row.id} row={row} />
            ))}
          </div>
        </section>
      ))}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
