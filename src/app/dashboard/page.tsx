"use client";

import { redirect } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { OverviewSkeleton } from "@/components/dashboard/overview-skeleton";
import { usePlatformSettings } from "@/hooks/use-platform-settings";

/**
 * `/dashboard` no longer renders the Overview. Retired 2026-09-15 and kept
 * as deprecated code: `MyJourneyOverview` / `TeamJourneyOverview` in
 * `src/components/dashboard/`, and this file's previous body in git history.
 *
 * The route now forwards to the journey that is on — My Journey first, then
 * All Teams — and only draws a placeholder when both are off. This is the
 * mirror image of the journey page guards: they bounce here when their
 * journey is off, this bounces only to a journey that is on, so the two can
 * never loop. Only a successful settings read may forward — the defaults
 * that stand in on a failed read would send everyone to Team Journey.
 */
export default function DashboardIndexPage() {
  const { user, loading: isLoadingProfile } = useApp();
  const {
    data: journeys,
    isLoading: isLoadingSettings,
    isError,
  } = usePlatformSettings();

  if (isLoadingSettings || isLoadingProfile) {
    return <OverviewSkeleton />;
  }

  if (!isError) {
    if (journeys.myJourney) redirect("/dashboard/my-journey");
    if (journeys.teamJourney) redirect("/dashboard/team-journey");
  }

  const isAdmin = user?.primary_role === "admin";

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-muted-foreground text-sm">
          {isError
            ? "Couldn't load the programme phase. Refresh the page to try again."
            : "Your dashboard will fill up once the programme starts."}
        </p>
        {isAdmin && !isError && (
          <p className="text-muted-foreground mt-2 text-xs">
            Both journeys are switched off. Turn one on under Admin → Programme
            Phase.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
