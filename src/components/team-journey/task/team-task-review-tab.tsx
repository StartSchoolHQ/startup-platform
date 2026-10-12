import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  UserRound,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TaskMarkdown } from "@/components/tasks/task-markdown";
import { TaskSectionTitle } from "@/components/tasks/task-content-lists";
import { SuggestEditsButton } from "@/components/team-journey/task/team-task-brief";
import { formatDate } from "@/lib/date-utils";
import { reviewFeedback } from "@/lib/team-journey/task-timeline";
import { cn } from "@/lib/utils";
import type { PeerReviewHistory } from "@/lib/validation-schemas";
import type { TeamTask } from "@/types/team-journey";

const initials = (name?: string | null) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "R";

function DecisionBadge({ decision }: { decision: "approved" | "rejected" }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        decision === "approved"
          ? "bg-green-500/10 text-green-700 dark:text-green-400"
          : "bg-destructive/10 text-destructive"
      )}
    >
      {decision === "approved" ? "Approved" : "Rejected"}
    </Badge>
  );
}

function ReviewerRow({
  name,
  avatarUrl,
  caption,
}: {
  name: string;
  avatarUrl?: string | null;
  caption: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="leading-tight">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-muted-foreground text-xs">{caption}</p>
      </div>
    </div>
  );
}

/** Review criteria, then where the peer review stands and what was said. */
export function TeamTaskReviewTab({
  task,
  history,
  onSuggestEdits,
}: {
  task: TeamTask;
  history: PeerReviewHistory;
  onSuggestEdits: () => void;
}) {
  const criteria = Array.isArray(task.peer_review_criteria)
    ? task.peer_review_criteria
    : [];
  const decision =
    task.status === "approved" || task.status === "rejected"
      ? task.status
      : null;
  const decided = decision !== null;
  const feedback = reviewFeedback(task);
  const reviewed = decided && (task.reviewer_name || feedback);
  const completed = [...history]
    .filter((e) => e.event_type === "review_completed")
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  return (
    <div className="space-y-4">
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-6 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <TaskSectionTitle icon={ClipboardCheck}>
              Review criteria
            </TaskSectionTitle>
            <SuggestEditsButton onClick={onSuggestEdits} />
          </div>
          {criteria.length > 0 ? (
            <div className="-mt-4 space-y-5">
              {criteria.map((group, index) => (
                <section key={index}>
                  <p className="mb-2 text-sm font-medium">{group.category}</p>
                  <div className="space-y-2">
                    {group.points.map((point, i) => (
                      <TaskMarkdown key={i}>{point}</TaskMarkdown>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground -mt-4 text-sm">
              No review criteria have been written for this task yet.
            </p>
          )}
        </div>
      </Card>

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <TaskSectionTitle icon={UserRound}>Peer review</TaskSectionTitle>
            {decision && <DecisionBadge decision={decision} />}
          </div>

          {task.status === "pending_review" ? (
            <div className="bg-muted/40 -mt-2 flex items-start gap-3 rounded-lg p-4">
              <Clock className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Under review</p>
                <p className="text-muted-foreground">
                  {task.reviewer_name
                    ? `${task.reviewer_name} is reviewing this submission.`
                    : "Waiting for a member of another team to pick it up."}
                </p>
              </div>
            </div>
          ) : reviewed ? (
            <div className="-mt-2 space-y-4">
              <ReviewerRow
                name={task.reviewer_name || "Peer reviewer"}
                avatarUrl={task.reviewer_avatar_url}
                caption={`Reviewed ${formatDate(task.updated_at || task.completed_at || new Date().toISOString())}`}
              />
              {feedback && (
                <p className="bg-muted/40 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {feedback}
                </p>
              )}
              {completed.length > 1 && (
                <section className="space-y-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    Earlier reviews
                  </p>
                  {completed.slice(0, -1).map((e, i) => (
                    <div key={i} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center gap-2">
                        {e.decision === "approved" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="text-destructive h-4 w-4" />
                        )}
                        <span className="font-medium">
                          {e.reviewer_name || "Reviewer"}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatDate(e.timestamp)}
                        </span>
                      </div>
                      {e.feedback && (
                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                          {e.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </section>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground -mt-2 text-sm">
              Nothing to review yet. Submit the task and a member of another
              team will look at it.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
