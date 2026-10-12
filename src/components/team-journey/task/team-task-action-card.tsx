"use client";

import {
  CheckCircle2,
  Clock,
  CreditCard,
  Play,
  RotateCcw,
  UserRoundCog,
  XCircle,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { economyLabels } from "@/lib/economy-labels";
import { formatDate } from "@/lib/date-utils";
import type { TaskPermissions } from "@/hooks/use-team-task";
import type { TeamTask } from "@/types/team-journey";

const labels = economyLabels("team");

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

export interface TaskActionPending {
  start: boolean;
  complete: boolean;
  cancel: boolean;
  retry: boolean;
}

/**
 * Right-hand card of the team task page, the twin of the solo
 * TaskActionCard: rewards, who is on it, then the one action the viewer's
 * permissions and the task's status allow.
 */
export function TeamTaskActionCard({
  task,
  permissions,
  pending,
  onStart,
  onComplete,
  onCancel,
  onRetry,
  onReassign,
}: {
  task: TeamTask;
  permissions: TaskPermissions;
  pending: TaskActionPending;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onReassign: () => void;
}) {
  const status = task.status as string;
  const canReassign =
    permissions.canReassign && !["approved", "pending_review"].includes(status);

  const action = (() => {
    if (status === "not_started" || status === "cancelled") {
      return permissions.canStart ? (
        <Button className="w-full" onClick={onStart} disabled={pending.start}>
          <Play className="h-4 w-4" />
          {pending.start
            ? "Starting..."
            : status === "cancelled"
              ? "Restart task"
              : "Start task"}
        </Button>
      ) : (
        <Button variant="outline" className="w-full" disabled>
          {status === "cancelled"
            ? "Cancelled"
            : task.assigned_to_user_id
              ? "Assigned to a teammate"
              : "Not assigned yet"}
        </Button>
      );
    }
    if (status === "in_progress") {
      if (!permissions.canComplete && !permissions.canCancel) {
        return (
          <Button variant="outline" className="w-full" disabled>
            <Clock className="h-4 w-4" />
            In progress
          </Button>
        );
      }
      return (
        <div className="space-y-2">
          {permissions.canComplete && (
            <Button
              className="w-full"
              onClick={onComplete}
              disabled={pending.complete}
            >
              <CheckCircle2 className="h-4 w-4" />
              {pending.complete ? "Submitting..." : "Submit task"}
            </Button>
          )}
          {permissions.canCancel && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive w-full"
              onClick={onCancel}
              disabled={pending.cancel}
            >
              <XCircle className="h-4 w-4" />
              {pending.cancel ? "Cancelling..." : "Cancel task"}
            </Button>
          )}
        </div>
      );
    }
    if (status === "pending_review") {
      return (
        <Button variant="outline" className="w-full" disabled>
          <Clock className="h-4 w-4" />
          Under peer review
        </Button>
      );
    }
    if (status === "approved") {
      return (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 py-2.5 text-sm font-medium text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Completed
        </div>
      );
    }
    if (status === "rejected" || status === "revision_required") {
      return permissions.canStart ? (
        <Button className="w-full" onClick={onRetry} disabled={pending.retry}>
          <RotateCcw className="h-4 w-4" />
          {pending.retry ? "Reopening..." : "Fix and resubmit"}
        </Button>
      ) : (
        <Button variant="outline" className="w-full" disabled>
          Needs revision
        </Button>
      );
    }
    return (
      <Button variant="outline" className="w-full" disabled>
        Status: {status}
      </Button>
    );
  })();

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

        {task.assigned_to_user_id ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={task.assignee_avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {task.assignee_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {task.assignee_name || "Teammate"}
              </p>
              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {task.started_at
                  ? `Started ${formatDate(task.started_at, "date-only")}`
                  : task.assigned_at
                    ? `Assigned ${formatDate(task.assigned_at, "date-only")}`
                    : "Not started yet"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nobody is on this task yet.
          </p>
        )}

        {action}

        {canReassign && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onReassign}
          >
            <UserRoundCog className="h-4 w-4" />
            Reassign
          </Button>
        )}
      </div>
    </Card>
  );
}
