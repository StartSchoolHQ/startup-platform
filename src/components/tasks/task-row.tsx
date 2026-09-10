"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { StatusBadge, TaskStatus } from "@/components/ui/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { CreditCard, Loader2, Lock, Zap } from "lucide-react";

interface Task {
  id: string;
  tasks?: {
    id: string;
    title: string;
    description: string;
    difficulty_level: number;
    base_xp_reward: number;
    base_points_reward: number;
    is_confidential?: boolean;
  } | null;
  teams?: {
    id: string;
    name: string;
  } | null;
  completed_at: string;
  status?: "pending_review" | "approved" | "rejected" | "revision_required";
}

interface TaskRowProps {
  task: Task;
  variant: "available" | "review" | "submitted";
  onAction: (task: Task) => void;
  actionLoading?: boolean;
  actionButtonText: string;
  actionButtonDisabled?: boolean;
  actionButtonVariant?: "default" | "outline" | "destructive";
  showStatus?: boolean;
  /** Show 10% of the task reward — what the reviewer earns. */
  reviewerReward?: boolean;
}

function reward(base: number | undefined, tenPercent: boolean) {
  const value = base || 0;
  return tenPercent ? Math.max(1, Math.round(value * 0.1)) : value;
}

/** One row of the peer-review tables (available, my reviews, my tasks). */
export function TaskRow({
  task,
  variant,
  onAction,
  actionLoading = false,
  actionButtonText,
  actionButtonDisabled = false,
  actionButtonVariant = "default",
  showStatus = false,
  reviewerReward = false,
}: TaskRowProps) {
  if (!task.tasks || !task.teams) return null;

  return (
    <tr
      className={cn(
        "hover:bg-muted/40 transition-colors",
        task.tasks.is_confidential && "bg-red-500/[0.04]"
      )}
    >
      <td className="px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{task.tasks.title}</span>
            {task.tasks.is_confidential && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="gap-1 border-red-500/30 px-1.5 py-0 text-[11px] font-medium text-red-600 dark:text-red-400"
                    >
                      <Lock className="h-2.5 w-2.5" />
                      Confidential
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This task can only be reviewed by admin users.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {task.tasks.description && (
            <p className="text-muted-foreground mt-0.5 line-clamp-1 max-w-md text-xs">
              {task.tasks.description}
            </p>
          )}
        </div>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <span className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              variant === "submitted" ? "bg-primary" : "bg-primary/60"
            )}
          />
          {task.teams.name}
        </span>
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <DifficultyBadge level={task.tasks.difficulty_level} />
      </td>

      {showStatus ? (
        <td className="px-4 py-3 whitespace-nowrap">
          {task.status && <StatusBadge status={task.status as TaskStatus} />}
        </td>
      ) : (
        <>
          <td className="px-4 py-3 whitespace-nowrap">
            <span className="flex items-center gap-1.5 text-sm">
              <Zap className="text-primary h-3.5 w-3.5" />
              <span className="font-medium tabular-nums">
                {reward(task.tasks.base_xp_reward, reviewerReward)}
              </span>
            </span>
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            <span className="flex items-center gap-1.5 text-sm">
              <CreditCard className="text-primary h-3.5 w-3.5" />
              <span className="font-medium tabular-nums">
                {reward(task.tasks.base_points_reward, reviewerReward)}
              </span>
            </span>
          </td>
        </>
      )}

      <td className="text-muted-foreground px-4 py-3 text-sm whitespace-nowrap">
        {formatDate(task.completed_at)}
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex justify-end">
          <Button
            variant={actionButtonVariant}
            size="sm"
            className="h-8"
            onClick={() => onAction(task)}
            disabled={actionLoading || actionButtonDisabled}
          >
            {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {actionButtonText}
          </Button>
        </div>
      </td>
    </tr>
  );
}
