"use client";

import { useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useIndividualWeeklyReportStatus,
  useSoloWeeklyReportMode,
} from "@/hooks/use-individual-weekly-report";
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
  const { soloMode, userId } = useSoloWeeklyReportMode();
  const { data: status } = useIndividualWeeklyReportStatus(
    soloMode ? userId : undefined
  );
  const [open, setOpen] = useState(false);

  if (!soloMode || !status || status.submitted) return null;
  if (!isWeeklyReportBannerWindow(status.week)) return null;

  return (
    <div className="px-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </span>
          <p className="text-sm">
            <span className="font-semibold text-amber-800 dark:text-amber-200">
              Weekly report due Monday 10:00
            </span>
            <span className="text-muted-foreground">
              {" "}
              — {formatWeekPeriod(status.week)}, My Journey
            </span>
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          className="group bg-amber-600 text-white hover:bg-amber-700"
        >
          {status.draft ? "Continue draft" : "Write it now"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
      <IndividualWeeklyReportModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
