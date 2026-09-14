"use client";

import { useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppContext } from "@/contexts/app-context";
import { useIndividualWeeklyReportStatus } from "@/hooks/use-individual-weekly-report";
import { useMyJourneyOverview } from "@/hooks/use-my-journey-overview";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import {
  formatWeekPeriod,
  isWeeklyReportBannerWindow,
} from "@/lib/weekly-reports";
import { IndividualWeeklyReportModal } from "@/components/weekly-reports/individual/individual-weekly-report-modal";

/**
 * Solo twin of WeeklyReportBanner: Friday → Monday 10:00 Riga, only while
 * My Journey is on, only for students who resolve to the solo form, and
 * only until this week's report is submitted. Opens the modal in place.
 */
export function IndividualWeeklyReportBanner() {
  const { user } = useAppContext();
  const { data: journeys } = usePlatformSettings();
  const { data: overview } = useMyJourneyOverview(
    journeys.myJourney && journeys.teamJourney ? user?.id : undefined
  );
  // has_active_team only matters while Team Journey is on; when it is off
  // the banner must not depend on the (heavier) overview RPC at all.
  const soloMode =
    journeys.myJourney &&
    (!journeys.teamJourney || overview?.has_active_team === false);
  const { data: status } = useIndividualWeeklyReportStatus(
    soloMode ? user?.id : undefined
  );
  const [open, setOpen] = useState(false);

  if (!soloMode || !status || status.submitted) return null;
  if (!isWeeklyReportBannerWindow(status.week)) return null;

  return (
    <div className="px-4 pt-2">
      <Alert className="mb-2 border-amber-500/50 bg-amber-500/10">
        <Clock className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm">
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              My Journey weekly report not submitted
            </span>
            <span className="text-muted-foreground">
              {" "}
              — {formatWeekPeriod(status.week)}
            </span>
            . Deadline:{" "}
            <span className="font-semibold">Monday 10:00 Riga time</span>.
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
          >
            {status.draft ? "Continue draft" : "Submit Now"}
            <ArrowRight className="h-3 w-3" />
          </button>
        </AlertDescription>
      </Alert>
      <IndividualWeeklyReportModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
