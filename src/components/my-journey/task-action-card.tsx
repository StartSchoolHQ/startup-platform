"use client";

import { CheckCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AiReviewProgress } from "@/components/my-journey/ai-review-progress";
import { AiReviewResult } from "@/components/my-journey/ai-review-result";
import type { AiReviewStatus } from "@/lib/database";
import type { TeamTask } from "@/types/team-journey";

interface TaskActionCardUser {
  name: string | null;
  avatar_url: string | null;
}

/** Right-hand "Task Information" sidebar card: who's on it + the status-driven action. */
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Task Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* User Info */}
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-xs font-bold text-white">
                {user.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">
                {user.name || "Unknown User"}
              </div>
              <div className="text-muted-foreground text-xs">
                {task.started_at
                  ? new Date(task.started_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Not started yet"}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons based on status */}
        {task.status === "in_progress" ? (
          <Button
            className="w-full gap-2"
            onClick={onComplete}
            disabled={isSubmitting}
          >
            <CheckCircle className="h-4 w-4" />
            {isSubmitting ? "Submitting..." : "Complete Task"}
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
          <Button
            className="w-full gap-2 bg-green-600 hover:bg-green-700"
            disabled
          >
            <CheckCircle className="h-4 w-4" />
            Completed
          </Button>
        ) : task.status === "rejected" ? (
          <Button className="w-full gap-2" onClick={onComplete}>
            <CheckCircle className="h-4 w-4" />
            Fix and resubmit
          </Button>
        ) : task.status === "not_started" ? (
          <Button variant="outline" className="w-full gap-2" disabled>
            <Play className="h-4 w-4" />
            Task Not Started
          </Button>
        ) : (
          <Button className="w-full" disabled>
            <CheckCircle className="mr-2 h-4 w-4" />
            Task Status: {task.status}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
