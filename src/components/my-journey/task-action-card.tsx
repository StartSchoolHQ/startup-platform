"use client";

import { CheckCircle2, Clock, CreditCard, Play, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AiReviewProgress } from "@/components/my-journey/ai-review-progress";
import { AiReviewResult } from "@/components/my-journey/ai-review-result";
import { economyLabels } from "@/lib/economy-labels";
import type { AiReviewStatus } from "@/lib/database";
import type { TeamTask } from "@/types/team-journey";

const labels = economyLabels("my_journey");

interface TaskActionCardUser {
  name: string | null;
  avatar_url: string | null;
}

function RewardRow({
  icon: Icon,
  value,
  unit,
}: {
  icon: typeof Zap;
  value: number;
  unit: string;
}) {
  return (
    <div className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2">
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        <Icon className="text-primary h-4 w-4" />
        {unit}
      </span>
      <span className="text-sm font-semibold tabular-nums">+{value}</span>
    </div>
  );
}

/**
 * Right-hand card of the solo task page: rewards, who is on it, and the
 * status-driven action (submit, AI review progress, result, resubmit).
 */
export function TaskActionCard({
  task,
  user,
  review,
  isSubmitting,
  onComplete,
  onReviewFinished,
}: {
  task: TeamTask;
  user: TaskActionCardUser | null;
  review: AiReviewStatus | null | undefined;
  isSubmitting: boolean;
  onComplete: () => void;
  onReviewFinished: (status: AiReviewStatus) => void;
}) {
  const startedLabel = task.started_at
    ? `Started ${new Date(task.started_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`
    : "Not started yet";

  return (
    <Card className="relative gap-0 overflow-hidden py-0">
      <div
        aria-hidden
        className="bg-primary/20 pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl"
      />
      <div className="relative flex flex-col gap-5 p-5">
        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            Reward
          </p>
          <div className="space-y-1.5">
            <RewardRow
              icon={Zap}
              value={task.base_xp_reward}
              unit={labels.xp}
            />
            <RewardRow
              icon={CreditCard}
              value={task.base_points_reward}
              unit={labels.points}
            />
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {user.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user.name || "You"}
              </p>
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {startedLabel}
              </p>
            </div>
          </div>
        )}

        {task.status === "in_progress" ? (
          <Button
            className="w-full"
            onClick={onComplete}
            disabled={isSubmitting}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Submit task"}
          </Button>
        ) : task.status === "pending_review" && task.progress_id ? (
          <AiReviewProgress
            progressId={task.progress_id}
            onFinished={onReviewFinished}
          />
        ) : (task.status === "approved" || task.status === "rejected") &&
          review ? (
          <AiReviewResult
            status={review}
            taskStatus={task.status}
            xp={task.base_xp_reward}
            points={task.base_points_reward}
            onResubmit={onComplete}
          />
        ) : task.status === "approved" ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 py-2.5 text-sm font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </div>
        ) : task.status === "rejected" ? (
          <Button className="w-full" onClick={onComplete}>
            <CheckCircle2 className="h-4 w-4" />
            Fix and resubmit
          </Button>
        ) : task.status === "not_started" ? (
          <Button variant="outline" className="w-full" disabled>
            <Play className="h-4 w-4" />
            Not started
          </Button>
        ) : (
          <Button className="w-full" disabled>
            Status: {task.status}
          </Button>
        )}
      </div>
    </Card>
  );
}
