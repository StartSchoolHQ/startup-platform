"use client";

import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useIndividualWeeklyReportStatus,
  useSoloWeeklyReportMode,
} from "@/hooks/use-individual-weekly-report";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { RouteStop } from "@/components/how-it-works/route-stop";
import {
  buildRouteStops,
  WEEKLY_REPORT_ACTION,
} from "@/components/how-it-works/route-stops";
import { IndividualWeeklyReportModal } from "@/components/weekly-reports/individual/individual-weekly-report-modal";

/**
 * A quick guide to the platform, told as one route in programme order:
 * My Journey, the weekly report, the leaderboard, feedback. Static copy,
 * phase-aware through the cached journey settings. The one live piece is
 * the weekly report stop: while the solo form applies and this week's
 * report is still open, its button opens the submission modal right here.
 */
export default function HowItWorksPage() {
  const { data: journeys, isLoading } = usePlatformSettings();
  const { soloMode, userId } = useSoloWeeklyReportMode();
  const { data: report } = useIndividualWeeklyReportStatus(
    soloMode ? userId : undefined
  );
  const [reportOpen, setReportOpen] = useState(false);

  const weeklyReportAction = useMemo(() => {
    if (!soloMode || !report || report.submitted) return null;
    return {
      id: WEEKLY_REPORT_ACTION,
      label: report.draft ? "Continue draft" : "Write this week's report",
    };
  }, [soloMode, report]);

  const stops = useMemo(
    () => buildRouteStops(journeys, weeklyReportAction),
    [journeys, weeklyReportAction]
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 pb-8 sm:space-y-14">
      <header className="space-y-3">
        <h1 className="max-w-2xl text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl">
          Welcome to Startup Module Platform!
        </h1>
        <p className="text-muted-foreground max-w-prose text-base leading-relaxed">
          This platform is designed to support you throughout the entire
          programme. We&apos;ll begin with My Journey, focusing on developing
          your individual skills and expanding your technical and
          business-related knowledge.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[3rem_1fr] gap-x-6">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-3 pt-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ol className="flex flex-col">
          {stops.map((stop, index) => (
            <RouteStop
              key={stop.id}
              stop={stop}
              isLast={index === stops.length - 1}
              nextIsLater={stops[index + 1]?.later === true}
              onAction={(id) => {
                if (id === WEEKLY_REPORT_ACTION) setReportOpen(true);
              }}
            />
          ))}
        </ol>
      )}

      <IndividualWeeklyReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </div>
  );
}
