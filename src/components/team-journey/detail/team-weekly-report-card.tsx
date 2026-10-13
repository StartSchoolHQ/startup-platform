"use client";

import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Eye,
  History,
  PenLine,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { cn } from "@/lib/utils";
import { formatWeekPeriod, type WeekBoundaries } from "@/lib/weekly-reports";

export interface ReportMember {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
}

const initials = (name: string | null) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

/**
 * This week's team report at a glance — the team twin of the solo
 * WeeklyReportCard in the My Journey top row. Each member is a dot (green
 * sent, red not yet); the viewer's own state drives the button: Write, or
 * View once sent (Sasha SMP-11: the grey "Report Submitted" led nowhere).
 */
export function TeamWeeklyReportCard({
  members,
  submissionStatus,
  week,
  isTeamMember,
  hasSubmitted,
  onWrite,
  onView,
  onHistory,
}: {
  members: ReportMember[];
  submissionStatus: Record<string, boolean>;
  week: WeekBoundaries | null | undefined;
  isTeamMember: boolean;
  hasSubmitted: boolean;
  onWrite: () => void;
  onView: () => void;
  onHistory: () => void;
}) {
  const sent = members.filter((m) => submissionStatus[m.user_id]).length;
  const allSent = members.length > 0 && sent === members.length;

  return (
    <Card className="h-full gap-0 py-0">
      <div className="flex h-full flex-col gap-5 p-5">
        <SectionLabel
          icon={CalendarClock}
          title="Weekly report"
          aside={week ? formatWeekPeriod(week) : undefined}
        />

        {/* Same two-group row as the solo card: status on the left, actions
            on the right. The member dots sit with the status so the right
            group stays two buttons wide and the row keeps the solo card's
            height. */}
        <div className="flex flex-1 flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                allSent
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : hasSubmitted
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-primary/10 text-primary"
              )}
            >
              {allSent || hasSubmitted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <PenLine className="h-4 w-4" />
              )}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium">
                {allSent
                  ? "Everyone has sent theirs"
                  : hasSubmitted
                    ? "Yours is in"
                    : isTeamMember
                      ? "Not submitted yet"
                      : "Team report"}
              </p>
              <p className="text-muted-foreground text-xs">
                {sent} of {members.length} sent · due Monday 10:00 Riga time
              </p>
            </div>
            <div className="ml-1 flex -space-x-2">
              {members.map((m) => {
                const known = m.user_id in submissionStatus;
                const done = submissionStatus[m.user_id];
                return (
                  <div
                    key={m.user_id}
                    className="relative"
                    title={m.name ?? ""}
                  >
                    <Avatar className="border-card h-7 w-7 border-2">
                      <AvatarImage src={m.avatar_url || ""} />
                      <AvatarFallback className="bg-muted text-[10px] font-semibold">
                        {initials(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    {known && (
                      <span
                        aria-hidden
                        className={cn(
                          "border-card absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2",
                          done ? "bg-green-500" : "bg-red-500"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onHistory}
              className="text-muted-foreground"
            >
              <History className="h-4 w-4" />
              Past reports
            </Button>
            {isTeamMember &&
              (hasSubmitted ? (
                <Button size="sm" variant="outline" onClick={onView}>
                  <Eye className="h-4 w-4" />
                  View this week&apos;s
                </Button>
              ) : (
                <Button size="sm" className="group" onClick={onWrite}>
                  Write this week&apos;s
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
