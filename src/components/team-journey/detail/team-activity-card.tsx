import {
  Activity,
  AlertTriangle,
  ChevronRight,
  FileText,
  Handshake,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { MEETINGS_TO_UNLOCK } from "@/hooks/use-team-detail";
import { cn } from "@/lib/utils";

const MAX_STRIKES = 5;

function Row({
  icon: Icon,
  title,
  meta,
  aside,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  meta: React.ReactNode;
  aside?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group hover:bg-muted/60 focus-visible:ring-primary flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <Icon className="text-primary h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-sm font-medium">{title}</span>
          <span className="text-muted-foreground block text-xs">{meta}</span>
        </span>
        {aside}
        <ChevronRight className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-colors" />
      </button>
    </li>
  );
}

/**
 * Meetings, strikes and past reports at a glance, each row a one-click jump
 * to its section further down the page. Exists because those three sections
 * sit below a long task list and were a scroll away from the top.
 */
export function TeamActivityCard({
  meetingsCount,
  strikesCount,
  reportsCount,
  lastReportWeek,
  isTeamMember,
  onAddMeeting,
  onJump,
}: {
  meetingsCount: number;
  strikesCount: number;
  reportsCount: number;
  lastReportWeek: string | null;
  isTeamMember: boolean;
  onAddMeeting: () => void;
  onJump: (sectionId: string) => void;
}) {
  const missing = Math.max(MEETINGS_TO_UNLOCK - meetingsCount, 0);

  return (
    <Card className="h-full gap-0 py-0">
      <div className="flex h-full flex-col gap-3 p-5">
        <SectionLabel icon={Activity} title="Team activity" />
        <ul className="-mx-2 flex flex-1 flex-col justify-center">
          <Row
            icon={Handshake}
            title="Client meetings"
            meta={
              missing > 0
                ? `${meetingsCount} logged · ${missing} more to unlock tasks`
                : `${meetingsCount} logged`
            }
            aside={
              isTeamMember ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddMeeting();
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              ) : undefined
            }
            onClick={() => onJump("meetings")}
          />
          <Row
            icon={AlertTriangle}
            title="Strikes"
            meta={
              strikesCount === 0
                ? "None. Keep the weekly reports coming."
                : `${strikesCount} of ${MAX_STRIKES}`
            }
            aside={
              <span className="flex shrink-0 gap-1" aria-hidden>
                {Array.from({ length: MAX_STRIKES }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2 w-2 rounded-full",
                      i < strikesCount ? "bg-destructive" : "bg-muted"
                    )}
                  />
                ))}
              </span>
            }
            onClick={() => onJump("strikes")}
          />
          <Row
            icon={FileText}
            title="Past weekly reports"
            meta={
              reportsCount === 0
                ? "None yet. The first one is due Monday 10:00."
                : `${reportsCount} ${reportsCount === 1 ? "week" : "weeks"}${
                    lastReportWeek ? ` · latest ${lastReportWeek}` : ""
                  }`
            }
            onClick={() => onJump("reports")}
          />
        </ul>
      </div>
    </Card>
  );
}
