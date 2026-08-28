"use client";

import { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useApp } from "@/contexts/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { OverviewSkeleton } from "@/components/dashboard/overview-skeleton";
import { AchievementProgressStrip } from "@/components/dashboard/my-journey/achievement-progress-strip";
import { ContinueCard } from "@/components/dashboard/my-journey/continue-card";
import { MyJourneySectionHeader } from "@/components/dashboard/my-journey/section-header";
import { MyJourneyStatCards } from "@/components/dashboard/my-journey/stat-cards";
import { NextUpCard } from "@/components/dashboard/my-journey/next-up-card";
import { RecentActivityCard } from "@/components/dashboard/my-journey/recent-activity-card";
import { useMyJourneyOverview } from "@/hooks/use-my-journey-overview";

/**
 * Everything the dashboard shows for the solo economy: balances, what the
 * student is mid-way through, what to pick up next, achievement progress and
 * the last few things they earned. The shell decides whether this mounts at
 * all, so nothing in here re-checks the programme phase.
 *
 * When both journeys are visible and the student also has an active team,
 * this collapses by default behind a slim summary header — Team Journey
 * takes priority in that view, but My Journey stays one click away.
 */
export function MyJourneyOverview({
  collapsible = false,
}: {
  collapsible?: boolean;
}) {
  const { user } = useApp();
  const { data, isLoading, isError, refetch } = useMyJourneyOverview(user?.id);
  const [isOpen, setIsOpen] = useState(false);

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
    return <OverviewSkeleton cardCount={3} />;
  }

  const content = (
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

  if (collapsible && data.has_active_team) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <MyJourneySectionHeader
          isOpen={isOpen}
          xp={data.balances.my_journey_xp}
          tasksCompleted={data.tasks.completed}
          tasksTotal={data.tasks.total}
        />
        <CollapsibleContent className="pt-4">{content}</CollapsibleContent>
      </Collapsible>
    );
  }

  return content;
}
