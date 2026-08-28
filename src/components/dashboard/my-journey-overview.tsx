"use client";

import { AlertCircle } from "lucide-react";
import { useApp } from "@/contexts/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { OverviewSkeleton } from "@/components/dashboard/overview-skeleton";
import { AchievementProgressStrip } from "@/components/dashboard/my-journey/achievement-progress-strip";
import { ContinueCard } from "@/components/dashboard/my-journey/continue-card";
import { MyJourneyStatCards } from "@/components/dashboard/my-journey/stat-cards";
import { NextUpCard } from "@/components/dashboard/my-journey/next-up-card";
import { RecentActivityCard } from "@/components/dashboard/my-journey/recent-activity-card";
import { useMyJourneyOverview } from "@/hooks/use-my-journey-overview";

/**
 * Everything the dashboard shows for the solo economy: balances, what the
 * student is mid-way through, what to pick up next, achievement progress and
 * the last few things they earned. The shell decides whether this mounts at
 * all, so nothing in here re-checks the programme phase.
 */
export function MyJourneyOverview() {
  const { user } = useApp();
  const { data, isLoading, isError } = useMyJourneyOverview(user?.id);

  if (isError) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="text-muted-foreground mb-3 h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            Couldn&apos;t load your progress — refresh to try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !data) {
    return <OverviewSkeleton cardCount={4} />;
  }

  return (
    <div className="space-y-6">
      <MyJourneyStatCards data={data} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ContinueCard tasks={data.in_progress} />
        <NextUpCard task={data.next_up} totalTasks={data.tasks.total} />
      </div>

      <AchievementProgressStrip achievements={data.achievement_progress} />

      <RecentActivityCard entries={data.recent_activity} />
    </div>
  );
}
