"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/contexts/app-context";
import { useIndividualWeeklyReportStatus } from "@/hooks/use-individual-weekly-report";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { formatWeekPeriod } from "@/lib/weekly-reports";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { IndividualWeeklyReportModal } from "@/components/weekly-reports/individual/individual-weekly-report-modal";
import { IndividualWeeklyReportHistory } from "@/components/weekly-reports/individual/individual-weekly-report-history";

/**
 * This week's solo report at a glance. Mode rule: a student in an active
 * team while Team Journey is on gets the TEAM form elsewhere, so this card
 * steps aside for them (mirrors send_individual_weekly_report_reminders_v1).
 */
export function WeeklyReportCard({
  hasActiveTeam,
}: {
  hasActiveTeam: boolean;
}) {
  const { user } = useApp();
  const { data: journeys } = usePlatformSettings();
  const soloMode =
    journeys.myJourney && !(journeys.teamJourney && hasActiveTeam);
  const { data, isLoading, isError, refetch } = useIndividualWeeklyReportStatus(
    soloMode ? user?.id : undefined
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!soloMode) return null;

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-4 p-5">
        <SectionLabel
          icon={CalendarClock}
          title="Weekly report"
          aside={data ? formatWeekPeriod(data.week) : undefined}
        />

        {isLoading && <Skeleton className="h-10 w-full" />}

        {isError && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Couldn&apos;t load your weekly report status.
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {data && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              {data.submitted ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Submitted this week</span>
                </>
              ) : data.draft ? (
                <>
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    Draft saved
                  </Badge>
                  <span className="text-muted-foreground">
                    Finish before Monday 10:00 Riga time.
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Not submitted yet. Deadline: Monday 10:00 Riga time.
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                disabled={data.history.length === 0}
              >
                <History className="mr-1 h-4 w-4" />
                Past reports
              </Button>
              {!data.submitted && (
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  {data.draft ? "Continue draft" : "Submit weekly report"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <IndividualWeeklyReportModal
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
      <IndividualWeeklyReportHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entries={data?.history ?? []}
      />
    </Card>
  );
}
