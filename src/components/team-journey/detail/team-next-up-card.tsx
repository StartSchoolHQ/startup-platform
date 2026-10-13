import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  CreditCard,
  Handshake,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { MEETINGS_TO_UNLOCK } from "@/hooks/use-team-detail";
import { economyLabels } from "@/lib/economy-labels";
import type { TeamDetailTask } from "@/lib/team-journey/detail-transforms";
import { cn } from "@/lib/utils";

const labels = economyLabels("team");

const STATUS_META: Record<string, { label: string; textClass: string }> = {
  in_progress: { label: "In progress", textClass: "text-primary" },
  pending_review: {
    label: "In review",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  rejected: {
    label: "Needs changes",
    textClass: "text-red-600 dark:text-red-400",
  },
};

const MAX_OPEN_ROWS = 3;

const taskHref = (t: TeamDetailTask) =>
  `/dashboard/team-journey/task/${t.progress_id ?? t.task_id}`;

function RewardChip({
  icon: Icon,
  value,
  unit,
}: {
  icon: typeof Zap;
  value: number;
  unit: string;
}) {
  return (
    <span className="bg-muted/60 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs">
      <Icon className="text-primary h-3.5 w-3.5" />
      <span className="font-medium tabular-nums">{value}</span>
      <span className="text-muted-foreground">{unit}</span>
    </span>
  );
}

/**
 * The team twin of My Journey's Next up + Continue cards, folded into one:
 * the task to pick up next on top, open work underneath. Before the meetings
 * gate opens, the honest next step is logging meetings, so that is what it
 * shows. Data comes from the task rows the page already holds.
 */
export function TeamNextUpCard({
  nextUp,
  inProgress,
  unlocked,
  meetingsCount,
  isTeamMember,
  currentUserId,
  onAddMeeting,
  onSeeTasks,
}: {
  nextUp: TeamDetailTask | null;
  inProgress: TeamDetailTask[];
  unlocked: boolean;
  meetingsCount: number;
  isTeamMember: boolean;
  currentUserId: string | undefined;
  onAddMeeting: () => void;
  onSeeTasks: () => void;
}) {
  const missing = Math.max(MEETINGS_TO_UNLOCK - meetingsCount, 0);
  const openRows = inProgress.slice(0, MAX_OPEN_ROWS);

  return (
    <Card className="relative h-full gap-0 overflow-hidden py-0">
      <div
        aria-hidden
        className="bg-primary/20 pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl"
      />
      <div className="relative flex h-full flex-col gap-5 p-5">
        <SectionLabel
          icon={Compass}
          title="Next up"
          aside={
            inProgress.length > 0 ? `${inProgress.length} open` : undefined
          }
        />

        {!unlocked ? (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-primary text-xs font-medium">
                Customer discovery
              </span>
              <h3 className="text-xl leading-snug font-semibold tracking-tight">
                Log {missing} more client{" "}
                {missing === 1 ? "meeting" : "meetings"}
              </h3>
              <p className="text-muted-foreground text-sm">
                Tasks open once the team has logged {MEETINGS_TO_UNLOCK}.{" "}
                {meetingsCount} so far.
              </p>
            </div>
            <div className="mt-auto flex justify-end pt-2">
              {isTeamMember ? (
                <Button size="sm" className="group" onClick={onAddMeeting}>
                  <Handshake className="h-4 w-4" />
                  Add meeting
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={onSeeTasks}>
                  See tasks
                </Button>
              )}
            </div>
          </>
        ) : nextUp ? (
          <>
            <div className="flex flex-col gap-1.5">
              {nextUp.achievement_name && (
                <span className="text-primary text-xs font-medium">
                  {nextUp.achievement_name}
                </span>
              )}
              <h3 className="text-xl leading-snug font-semibold tracking-tight">
                {nextUp.title}
              </h3>
              <p className="text-muted-foreground text-xs">
                {nextUp.assigned_to_user_id
                  ? nextUp.assigned_to_user_id === currentUserId
                    ? "Assigned to you"
                    : `Assigned to ${nextUp.assignee_name ?? "a teammate"}`
                  : "Not assigned yet"}
              </p>
            </div>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <RewardChip
                  icon={Zap}
                  value={nextUp.base_xp_reward}
                  unit={labels.xp}
                />
                <RewardChip
                  icon={CreditCard}
                  value={nextUp.base_credits_reward}
                  unit={labels.points}
                />
              </div>
              <Button asChild size="sm" className="group">
                <Link href={taskHref(nextUp)}>
                  Open task
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground flex flex-1 items-center text-sm">
            Every available task has been picked up. Finish what is open.
          </p>
        )}

        {openRows.length > 0 && (
          <ul className="border-border/70 -mb-1 flex flex-col border-t pt-3">
            {openRows.map((task) => {
              const meta = STATUS_META[task.status] ?? STATUS_META.in_progress;
              return (
                <li key={task.progress_id ?? task.task_id}>
                  <Link
                    href={taskHref(task)}
                    className="group hover:bg-muted/60 focus-visible:ring-primary -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full bg-current",
                        meta.textClass
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {task.title}
                    </span>
                    {task.assignee_name && (
                      <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
                        {task.assignee_name.split(" ")[0]}
                      </span>
                    )}
                    <span className="text-muted-foreground group-hover:text-primary flex shrink-0 items-center gap-1 text-xs transition-colors">
                      {meta.label}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
