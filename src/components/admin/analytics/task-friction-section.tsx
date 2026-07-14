"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsTaskFriction } from "./use-analytics";
import { CHART_COLORS } from "./types";

export function TaskFrictionSection({ active }: { active: boolean }) {
  const { data, isLoading } = useAnalyticsTaskFriction(active);

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (!data) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Where the curriculum loses people</CardTitle>
          <CardDescription>
            Lowest approval rate among tasks assigned 5+ times — candidates for
            redesign or removal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.least_completed.map((t) => (
            <div key={t.title} className="flex items-center gap-3">
              <span className="flex-1 truncate text-sm" title={t.title}>
                {t.title}
              </span>
              <div className="bg-muted h-4 w-24 overflow-hidden rounded">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.max(t.approval_rate, 2)}%`,
                    backgroundColor:
                      t.approval_rate < 30
                        ? CHART_COLORS.negative
                        : t.approval_rate < 60
                          ? CHART_COLORS.warning
                          : CHART_COLORS.positive,
                  }}
                />
              </div>
              <span className="text-muted-foreground w-24 text-right text-xs">
                {t.approved}/{t.assigned} · {t.approval_rate}%
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slowest tasks</CardTitle>
          <CardDescription>
            Average days from start to approval (3+ completions)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.slowest.map((t) => (
            <div key={t.title} className="flex items-center gap-3">
              <span className="flex-1 truncate text-sm" title={t.title}>
                {t.title}
              </span>
              <span className="text-sm font-medium">{t.avg_days}d</span>
              <span className="text-muted-foreground w-12 text-right text-xs">
                ×{t.completions}
              </span>
            </div>
          ))}
          {data.stale_in_progress.count > 0 && (
            <p className="text-muted-foreground border-t pt-2 text-xs">
              {data.stale_in_progress.count} tasks have been &ldquo;in
              progress&rdquo; for over 3 weeks (oldest since{" "}
              {data.stale_in_progress.oldest_started ?? "—"}).
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Most rejected / reworked</CardTitle>
          <CardDescription>
            Tasks students had to redo — unclear instructions or too hard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.most_rejected.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No rejections recorded.
            </p>
          )}
          {data.most_rejected.map((t) => (
            <div key={t.title} className="flex items-center gap-3">
              <span className="flex-1 truncate text-sm" title={t.title}>
                {t.title}
              </span>
              <span
                className="text-xs"
                style={{ color: CHART_COLORS.negative }}
              >
                {t.rejections} rejected
              </span>
              <span className="text-muted-foreground w-20 text-right text-xs">
                {t.resubmissions} redone
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
