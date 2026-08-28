import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsGridSkeleton } from "@/components/ui/stats-grid-skeleton";

/**
 * Placeholder for a dashboard overview section: a stats grid plus the
 * progress cards below it. Shared by the dashboard shell (while the
 * programme phase loads) and by the Team Journey overview itself.
 */
export function OverviewSkeleton({ cardCount = 3 }: { cardCount?: number }) {
  return (
    <div className="space-y-6">
      <StatsGridSkeleton count={cardCount} />
      <Skeleton className="h-48 w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
