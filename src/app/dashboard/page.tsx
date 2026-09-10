"use client";

import { useApp } from "@/contexts/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { OverviewSkeleton } from "@/components/dashboard/overview-skeleton";
import { MyJourneyOverview } from "@/components/dashboard/my-journey-overview";
import { TeamJourneyOverview } from "@/components/dashboard/team-journey-overview";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
// Onborda disabled temporarily — uncomment to re-enable
// import { DashboardTourTrigger } from "@/components/onboarding/dashboard-tour-trigger";

/**
 * Dashboard shell. Owns nothing but the greeting and which economy
 * sections are on: each journey renders its own data. On a failed settings
 * read the hook falls back to the journey defaults, so this never blanks
 * out and never redirects.
 */
export default function OverviewPage() {
  const { firstName, user, loading: isLoadingProfile } = useApp();
  const { data: journeys, isLoading: isLoadingSettings } =
    usePlatformSettings();

  // The phase switch is the single source of truth — a journey that is off
  // is hidden for admins too, so what an admin sees here is what students
  // see. Admins can still open the hidden pages directly by URL.
  const isAdmin = user?.primary_role === "admin";
  const showMyJourney = journeys.myJourney;
  const showTeamJourney = journeys.teamJourney;

  if (isLoadingSettings || isLoadingProfile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Hi {firstName} 👋</h1>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
        <OverviewSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <DashboardTourTrigger /> */}
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold">Hi {firstName} 👋</h1>
        <p className="text-muted-foreground">
          {showTeamJourney
            ? "Here you can see progress for you and your team"
            : "Here you can see your progress"}
        </p>
      </div>

      {showMyJourney && <MyJourneyOverview collapsible={showTeamJourney} />}

      {showTeamJourney && <TeamJourneyOverview />}

      {!showMyJourney && !showTeamJourney && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-muted-foreground text-sm">
              Your dashboard will fill up once the programme starts.
            </p>
            {isAdmin && (
              <p className="text-muted-foreground mt-2 text-xs">
                Both journeys are switched off. Turn one on under Admin →
                Programme Phase.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
