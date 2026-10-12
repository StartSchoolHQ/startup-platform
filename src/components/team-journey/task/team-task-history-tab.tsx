import { CheckCircle2, Clock, History, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { TaskSectionTitle } from "@/components/tasks/task-content-lists";
import { formatDate } from "@/lib/date-utils";
import { buildTaskTimeline } from "@/lib/team-journey/task-timeline";
import { cn } from "@/lib/utils";
import type { PeerReviewHistory } from "@/lib/validation-schemas";
import type { TeamTask } from "@/types/team-journey";

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "R";

/** The task's lifecycle, newest first, on the solo history tab's styling. */
export function TeamTaskHistoryTab({
  task,
  history,
}: {
  task: TeamTask;
  history: PeerReviewHistory;
}) {
  const events = buildTaskTimeline(task, history);

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <TaskSectionTitle icon={History}>History</TaskSectionTitle>

        {task.status === "pending_review" && (
          <div className="-mt-2 flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm">
            <span className="bg-primary h-2 w-2 animate-pulse rounded-full" />
            <span className="font-medium">Awaiting peer review</span>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-muted-foreground -mt-2 py-8 text-center text-sm">
            <Clock className="mx-auto mb-3 h-10 w-10 opacity-40" />
            Nothing has happened on this task yet.
          </div>
        ) : (
          <ol className="-mt-2 space-y-3">
            {events.map((event, index) => (
              <li key={index} className="flex gap-3 rounded-lg border p-3">
                <span className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {event.decision === "approved" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : event.decision === "rejected" ? (
                    <XCircle className="text-destructive h-4 w-4" />
                  ) : (
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        event.type === "started" || event.type === "assigned"
                          ? "bg-primary"
                          : "bg-muted-foreground/60"
                      )}
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">{event.title}</p>
                  {event.reviewer && (
                    <div className="mt-1 flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        {event.reviewer.avatar_url ? (
                          <AvatarImage src={event.reviewer.avatar_url} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                          {initials(event.reviewer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">
                        {event.reviewer.name}
                      </span>
                    </div>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {formatDate(event.timestamp)}
                  </p>
                  {event.description && (
                    <p className="text-muted-foreground mt-1">
                      {event.description}
                    </p>
                  )}
                  {event.feedback && (
                    <p className="bg-muted/40 mt-2 rounded-md p-2 whitespace-pre-wrap">
                      {event.feedback}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}
