"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Rocket,
  ListChecks,
  Eye,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface PendingTask {
  task_id: string;
  task_name: string;
  task_status: string;
  team_name: string;
  due_date: string | null;
}

interface WhatsNextCardProps {
  pendingTasksCount: number;
  pendingReviewsCount: number;
  pendingTasks: PendingTask[];
}

function TaskStatusBadge({ status }: { status: string }) {
  if (status === "in_progress") {
    return (
      <Badge
        variant="secondary"
        className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      >
        In Progress
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
    >
      Not Started
    </Badge>
  );
}

export function WhatsNextCard({
  pendingTasksCount,
  pendingReviewsCount,
  pendingTasks,
}: WhatsNextCardProps) {
  const allCaughtUp = pendingTasksCount === 0 && pendingReviewsCount === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Rocket className="text-muted-foreground h-5 w-5" />
          <CardTitle className="text-lg font-semibold">
            What&apos;s Next
          </CardTitle>
          {allCaughtUp && (
            <Badge
              variant="secondary"
              className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              All caught up
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Tasks */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <ListChecks className="text-muted-foreground h-5 w-5 shrink-0" />
            {pendingTasksCount > 0 ? (
              <p className="text-sm font-medium">
                {pendingTasksCount} pending{" "}
                {pendingTasksCount === 1 ? "task" : "tasks"}
              </p>
            ) : (
              <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                All caught up! No pending tasks.
              </div>
            )}
          </div>
          {pendingTasks.length > 0 && (
            <div className="space-y-1.5 pl-8">
              {pendingTasks.slice(0, 3).map((task) => (
                <Link
                  key={task.task_id}
                  href={`/dashboard/team-journey/task/${task.task_id}`}
                  className="hover:bg-muted/50 flex items-center justify-between gap-2 rounded-md p-1.5 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="max-w-[200px] truncate font-medium">
                      {task.task_name}
                    </span>
                    <TaskStatusBadge status={task.task_status} />
                    <span className="text-muted-foreground/60">
                      {task.team_name}
                    </span>
                  </div>
                  <ArrowRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                </Link>
              ))}
              {pendingTasksCount > 3 && (
                <Link
                  href="/dashboard/team-journey"
                  className="text-muted-foreground hover:text-foreground pl-1.5 text-xs transition-colors"
                >
                  +{pendingTasksCount - 3} more tasks →
                </Link>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Peer Reviews */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Eye className="text-muted-foreground h-5 w-5 shrink-0" />
            {pendingReviewsCount > 0 ? (
              <p className="text-sm font-medium">
                {pendingReviewsCount}{" "}
                {pendingReviewsCount === 1 ? "task" : "tasks"} waiting for your
                review
              </p>
            ) : (
              <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                No reviews pending
              </div>
            )}
          </div>
          {pendingReviewsCount > 0 && (
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href="/dashboard/peer-review">
                Review Now
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
