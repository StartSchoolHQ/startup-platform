"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import type { AdminStats } from "@/types/admin-stats";
import { HealthSnapshot } from "./health-snapshot";
import { MyJourneySection } from "./overview/my-journey-section";
import { TeamJourneySection } from "./overview/team-journey-section";
import { PausedCard } from "./overview/paused-card";

async function fetchStats(): Promise<AdminStats> {
  const res = await fetch("/api/admin/stats");
  if (!res.ok) throw new Error(`stats request failed (${res.status})`);
  return res.json();
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-3 h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Admin overview. Students card always; then one section per journey that
 * is switched on in Settings. Settings themselves live on /admin/settings.
 */
export function AdminOverview() {
  const { data: journeys } = usePlatformSettings();
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchStats,
    staleTime: 30 * 1000,
  });

  if (stats.isLoading) return <OverviewSkeleton />;

  if (stats.isError || !stats.data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertTriangle className="text-muted-foreground h-10 w-10" />
          <div className="text-center">
            <p className="font-medium">Failed to load platform stats</p>
            <p className="text-muted-foreground mt-1 text-sm">
              This is usually temporary. Try again in a moment.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => stats.refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const h = stats.data.programHealth;
  const anyOn = journeys.myJourney || journeys.teamJourney;

  return (
    <div className="space-y-6">
      {h && (
        <HealthSnapshot
          students={{
            active: h.students_active ?? 0,
            slowing: h.students_slowing ?? 0,
            at_risk: h.students_at_risk ?? 0,
            active_wow_delta: h.students_active_wow_delta ?? 0,
            at_risk_wow_delta: h.students_at_risk_wow_delta ?? 0,
          }}
        />
      )}
      {!anyOn && <PausedCard />}
      {journeys.myJourney && <MyJourneySection stats={stats.data} />}
      {journeys.teamJourney && <TeamJourneySection stats={stats.data} />}
    </div>
  );
}
