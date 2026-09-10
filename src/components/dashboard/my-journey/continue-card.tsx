import Link from "next/link";
import { ChevronRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/date-utils";
import {
  MyJourneyInProgressTask,
  MyJourneyTaskStatus,
} from "@/types/dashboard";
import { CardTitleRow } from "@/components/dashboard/my-journey/card-title-row";

// Student-facing wording. The shared StatusBadge speaks in reviewer terms
// ("Peer Review", "Not Accepted"), which reads as a verdict here rather than
// as the next thing to do — hence the local map.
const STATUS_META: Record<
  MyJourneyTaskStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  in_progress: {
    label: "In progress",
    dotClass: "bg-orange-500",
    textClass: "text-orange-700 dark:text-orange-400",
  },
  pending_review: {
    label: "Being reviewed",
    dotClass: "bg-purple-500",
    textClass: "text-purple-700 dark:text-purple-400",
  },
  rejected: {
    label: "Needs changes",
    dotClass: "bg-red-500",
    textClass: "text-red-700 dark:text-red-400",
  },
};

export function ContinueCard({ tasks }: { tasks: MyJourneyInProgressTask[] }) {
  return (
    <Card className="h-full">
      <CardTitleRow
        icon={PlayCircle}
        title="Continue"
        aside={
          tasks.length > 0
            ? `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} open`
            : undefined
        }
      />
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">
              Nothing in progress yet. Pick a task and it will show up here.
            </p>
            <Button asChild size="sm">
              <Link href="/dashboard/my-journey">Pick your first task</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => {
              const meta = STATUS_META[task.status] ?? STATUS_META.in_progress;
              return (
                <li key={task.progress_id}>
                  <Link
                    href={`/dashboard/my-journey/task/${task.progress_id}`}
                    className="group hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-primary flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {task.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            meta.dotClass
                          )}
                        />
                        <span className={cn("font-medium", meta.textClass)}>
                          {meta.label}
                        </span>
                        {task.started_at && (
                          <span className="text-muted-foreground">
                            · started {formatRelativeTime(task.started_at)}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-primary flex shrink-0 items-center gap-0.5 text-sm font-medium">
                      {task.status === "rejected" ? "Fix" : "Resume"}
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
