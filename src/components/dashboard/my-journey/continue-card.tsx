import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/date-utils";
import {
  MyJourneyInProgressTask,
  MyJourneyTaskStatus,
} from "@/types/dashboard";

// Student-facing wording. The shared StatusBadge speaks in reviewer terms
// ("Peer Review", "Not Accepted"), which reads as a verdict here rather than
// as the next thing to do — hence the local map.
const STATUS_META: Record<
  MyJourneyTaskStatus,
  { label: string; className: string }
> = {
  in_progress: {
    label: "In progress",
    className:
      "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400",
  },
  pending_review: {
    label: "Waiting for review",
    className:
      "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400",
  },
  rejected: {
    label: "Needs changes",
    className:
      "bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/20 dark:text-red-400",
  },
};

export function ContinueCard({ tasks }: { tasks: MyJourneyInProgressTask[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <PlayCircle className="text-primary h-5 w-5" />
        <CardTitle className="text-lg">Continue</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">
              Nothing in progress yet.
            </p>
            <Button asChild size="sm">
              <Link href="/dashboard/my-journey">Pick your first task</Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => {
              const meta = STATUS_META[task.status] ?? STATUS_META.in_progress;
              return (
                <li
                  key={task.progress_id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={meta.className}>
                        {meta.label}
                      </Badge>
                      {task.started_at && (
                        <span className="text-muted-foreground text-xs">
                          Started {formatRelativeTime(task.started_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/dashboard/my-journey/task/${task.progress_id}`}
                    >
                      Resume
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
