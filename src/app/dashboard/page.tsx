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

  const isAdmin = user?.primary_role === "admin";
  const showMyJourney = journeys.myJourney || isAdmin;
  const showTeamJourney = journeys.teamJourney || isAdmin;

  // `isAdmin` reads `user.primary_role`, which is falsy until the profile
  // resolves — choosing sections before then would flash the wrong one at
  // admins. Wait for both reads.
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
          Here you can see progress for you and your team
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
