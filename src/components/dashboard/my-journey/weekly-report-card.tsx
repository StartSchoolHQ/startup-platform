"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  History,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useIndividualWeeklyReportStatus,
  useSoloWeeklyReportMode,
} from "@/hooks/use-individual-weekly-report";
import { cn } from "@/lib/utils";
import { formatWeekPeriod } from "@/lib/weekly-reports";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { IndividualWeeklyReportModal } from "@/components/weekly-reports/individual/individual-weekly-report-modal";
import { IndividualWeeklyReportHistory } from "@/components/weekly-reports/individual/individual-weekly-report-history";

function formatSubmitted(date: string | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * This week's solo report at a glance. Since 2026-09-21 it sits in the My
 * Journey page's top row next to the stat cards (`h-full` matches their
 * height). Mode rule via useSoloWeeklyReportMode: a student in an active
 * team while Team Journey is on gets the TEAM form elsewhere, so this card
 * steps aside and renders `fallback` for them.
 */
export function WeeklyReportCard({
  hasActiveTeam,
  fallback = null,
}: {
  /** Pass when the caller already has the overview; fetched otherwise. */
  hasActiveTeam?: boolean;
  fallback?: ReactNode;
}) {
  const { soloMode, userId } = useSoloWeeklyReportMode(hasActiveTeam);
  const { data, isLoading, isError, refetch } = useIndividualWeeklyReportStatus(
    soloMode ? userId : undefined
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!soloMode) return <>{fallback}</>;

  const state = !data
    ? null
    : data.submitted
      ? "submitted"
      : data.draft
        ? "draft"
        : "open";

  return (
    <Card className="h-full gap-0 py-0">
      <div className="flex h-full flex-col gap-5 p-5">
        <SectionLabel
          icon={CalendarClock}
          title="Weekly report"
          aside={data ? formatWeekPeriod(data.week) : undefined}
        />

        {isLoading && <Skeleton className="h-9 w-2/3" />}

        {isError && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Couldn&apos;t load your weekly report.
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {data && state && (
          <div className="flex flex-1 flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  state === "submitted"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : state === "draft"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-primary/10 text-primary"
                )}
              >
                {state === "submitted" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <PenLine className="h-4 w-4" />
                )}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-medium">
                  {state === "submitted"
                    ? "Submitted"
                    : state === "draft"
                      ? "Draft saved"
                      : "Not submitted yet"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {state === "submitted"
                    ? formatSubmitted(data.submitted_at)
                    : "Due Monday 10:00 Riga time"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                disabled={data.history.length === 0}
                className="text-muted-foreground"
              >
                <History className="h-4 w-4" />
                Past reports
              </Button>
              {state !== "submitted" && (
                <Button
                  size="sm"
                  className="group"
                  onClick={() => setModalOpen(true)}
                >
                  {state === "draft" ? "Continue draft" : "Write this week's"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
