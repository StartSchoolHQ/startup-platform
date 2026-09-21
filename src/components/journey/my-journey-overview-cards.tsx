"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AchievementProgressV2 } from "@/components/dashboard/my-journey/achievement-progress-v2";
import { ContinueCardV2 } from "@/components/dashboard/my-journey/continue-card-v2";
import { NextUpCardV2 } from "@/components/dashboard/my-journey/next-up-card-v2";
import { useMyJourneyOverview } from "@/hooks/use-my-journey-overview";

/**
 * The three dashboard cards that moved onto the My Journey page when the
 * Overview page was retired (2026-09-15): what to pick up next, what is
 * mid-way, and the phase track. Same components, same RPC
 * (`get_my_journey_overview_v1`) — this wrapper only owns the fetch state.
 * Rendered inside the page's `space-y-6` column, so the fragment's two rows
 * pick up the page rhythm.
 */
export function MyJourneyOverviewCards({ userId }: { userId: string }) {
  const { data, isLoading, isError, refetch } = useMyJourneyOverview(userId);

  if (isError) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="text-muted-foreground mb-3 h-8 w-8" />
          <p className="text-muted-foreground mb-4 text-sm">
            Couldn&apos;t load your progress
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </>
    );
  }

  return (
    <>
      {/* Continue first: finishing what is open beats starting something. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <ContinueCardV2 tasks={data.in_progress} />
        <NextUpCardV2 task={data.next_up} totalTasks={data.tasks.total} />
      </div>

      <AchievementProgressV2 achievements={data.achievement_progress} />
    </>
  );
}
