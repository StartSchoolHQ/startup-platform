"use client";

import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { WeeklyReportsTable } from "@/components/team-journey/weekly-reports-table";
import type { TeamWeeklyReportRow } from "@/lib/team-journey/detail-transforms";

/** Every past team weekly report, one row per week, newest first. */
export function TeamReportsSection({
  id,
  reports,
  openReportId,
  onOpenReportChange,
}: {
  id: string;
  reports: TeamWeeklyReportRow[];
  openReportId: string | null;
  onOpenReportChange: (id: string | null) => void;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-4 p-5">
          <SectionLabel
            icon={FileText}
            title="Past weekly reports"
            aside={`${reports.length} ${reports.length === 1 ? "week" : "weeks"}`}
          />
          {reports.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No weekly reports yet. The first one is due Monday 10:00.
            </p>
          ) : (
            <WeeklyReportsTable
              reports={reports}
              openReportId={openReportId}
              onOpenReportChange={onOpenReportChange}
            />
          )}
        </div>
      </Card>
    </section>
  );
}
