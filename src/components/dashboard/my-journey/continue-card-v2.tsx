import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/date-utils";
import {
  MyJourneyInProgressTask,
  MyJourneyTaskStatus,
} from "@/types/dashboard";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";

// Student-facing wording. The shared StatusBadge speaks in reviewer terms
// ("Peer Review", "Not Accepted"), which reads as a verdict here rather than
// as the next thing to do — hence the local map.
const STATUS_META: Record<
  MyJourneyTaskStatus,
  { label: string; action: string; textClass: string }
> = {
  in_progress: {
    label: "In progress",
    action: "Resume",
    textClass: "text-orange-600 dark:text-orange-400",
  },
  pending_review: {
    label: "Being reviewed",
    action: "View submission",
    textClass: "text-purple-600 dark:text-purple-400",
  },
  rejected: {
    label: "Needs changes",
    action: "Fix and resubmit",
    textClass: "text-red-600 dark:text-red-400",
  },
};

function taskHref(task: MyJourneyInProgressTask) {
  return `/dashboard/my-journey/task/${task.progress_id}`;
}

/**
 * What the student is mid-way through. The most recently started task is
 * featured in the same layout as Next up; any other open tasks (the RPC
 * returns up to three) follow as compact rows.
 */
export function ContinueCardV2({
  tasks,
}: {
  tasks: MyJourneyInProgressTask[];
}) {
  const [featured, ...rest] = tasks;
  const meta = featured
    ? (STATUS_META[featured.status] ?? STATUS_META.in_progress)
    : null;

  return (
    <Card className="h-full gap-0 py-0">
      <div className="flex h-full flex-col gap-5 p-5">
        <SectionLabel
          icon={PlayCircle}
          title="Continue"
          aside={tasks.length > 1 ? `${tasks.length} open` : undefined}
        />

        {!featured || !meta ? (
          <div className="border-border/70 flex flex-1 flex-col items-start justify-center gap-3 rounded-xl border border-dashed p-5">
            <p className="text-sm font-medium">Nothing in progress yet</p>
            <p className="text-muted-foreground -mt-2 text-sm">
              Pick a task and it will show up here so you can jump back in.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/my-journey">Pick your first task</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col justify-center gap-2">
              <span className={cn("text-xs font-medium", meta.textClass)}>
                {meta.label}
              </span>
              <h3 className="text-xl leading-snug font-semibold tracking-tight">
                {featured.title}
              </h3>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {featured.started_at && (
                  <span className="bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs">
                    <Clock className="text-primary h-3.5 w-3.5" />
                    Started {formatRelativeTime(featured.started_at)}
                  </span>
                )}
              </div>
              <Button asChild size="sm" className="group">
                <Link href={taskHref(featured)}>
                  {meta.action}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>

            {rest.length > 0 && (
              <ul className="border-border/70 -mb-1 flex flex-col border-t pt-3">
                {rest.map((task) => {
                  const rowMeta =
                    STATUS_META[task.status] ?? STATUS_META.in_progress;
                  return (
                    <li key={task.progress_id}>
                      <Link
                        href={taskHref(task)}
                        className="group hover:bg-muted/60 focus-visible:ring-primary -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full bg-current",
                            rowMeta.textClass
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {task.title}
                        </span>
                        <span className="text-muted-foreground group-hover:text-primary flex shrink-0 items-center gap-1 text-xs transition-colors">
                          {rowMeta.label}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
