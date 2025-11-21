"use client";

import { Button } from "@/components/ui/button";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { StatusBadge, TaskStatus } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/date-utils";
import { Medal, Zap } from "lucide-react";

interface Task {
  id: string;
  tasks?: {
    id: string;
    title: string;
    description: string;
    difficulty_level: number;
    base_xp_reward: number;
    base_points_reward: number;
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
  reviewerReward?: boolean; // Show 10% of XP as reviewer reward
}

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
  if (!task.tasks || !task.teams) {
    return null; // Skip tasks with null relations
  }

  // Determine team dot color based on variant - using theme colors
  const teamDotColor = variant === "submitted" ? "bg-primary" : "bg-primary/70";

  return (
    <tr className="border-b border-border hover:bg-muted/50">
      {/* Task Info */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
            <Medal className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-sm">{task.tasks.title}</div>
            <div className="text-xs text-muted-foreground max-w-xs truncate">
              {task.tasks.description}
            </div>
          </div>
        </div>
      </td>

      {/* Team */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${teamDotColor} rounded-full`}></div>
          <span className="text-sm font-medium">{task.teams.name}</span>
        </div>
      </td>

      {/* Difficulty */}
      <td className="py-4 px-4">
        <DifficultyBadge level={task.tasks.difficulty_level} />
      </td>

      {/* Status (conditional) */}
      {showStatus && (
        <td className="py-4 px-4">
          {task.status && <StatusBadge status={task.status as TaskStatus} />}
        </td>
      )}

      {/* XP Reward (only show if not showing status) */}
      {!showStatus && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {reviewerReward
                ? Math.max(
                    1,
                    Math.round((task.tasks.base_xp_reward || 0) * 0.1)
                  )
                : task.tasks.base_xp_reward || 0}
            </span>
          </div>
        </td>
      )}

      {/* Points Reward (only show if not showing status) */}
      {!showStatus && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-1">
            <Medal className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">
              {reviewerReward
                ? Math.max(
                    1,
                    Math.round((task.tasks.base_points_reward || 0) * 0.1)
                  )
                : task.tasks.base_points_reward || 0}
            </span>
          </div>
        </td>
      )}

      {/* Submitted Date */}
      <td className="py-4 px-4">
        <div className="text-sm text-muted-foreground">
          {formatDate(task.completed_at)}
        </div>
      </td>

      {/* Action */}
      <td className="py-4 px-4">
        <div className="flex justify-end gap-2">
          <Button
            variant={actionButtonVariant}
            size="sm"
            className="text-xs px-3 py-2"
            onClick={() => onAction(task)}
            disabled={actionLoading || actionButtonDisabled}
          >
            {actionLoading ? "Loading..." : actionButtonText}
          </Button>
        </div>
      </td>
    </tr>
  );
}
