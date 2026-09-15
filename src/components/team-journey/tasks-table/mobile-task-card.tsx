"use client";

import { CreditCard, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import type { TaskTableItem } from "@/types/team-journey";
import type { EconomyLabels } from "@/lib/economy-labels";
import { TaskTitleCell } from "./title-cell";
import { TaskResponsibleCell, type TeamMemberOption } from "./responsible-cell";
import { TaskCooldownStatus } from "./cooldown-status";
import { TaskRowActions } from "./row-actions";
import { PhaseLockedBadge } from "./phase-locked-badge";
import { DIFFICULTY_LEVEL, isCoolingDown, toBadgeStatus } from "./status";

interface MobileTaskCardProps {
  task: TaskTableItem;
  labels: EconomyLabels;
  isSolo: boolean;
  badgeVariant: "my_journey" | "journey";
  isTeamMember: boolean;
  teamMembers: TeamMemberOption[];
  currentUserId?: string;
  onAssignTask?: (taskId: string, userId: string) => void;
  onStartTask?: (taskId: string) => void;
  onPreview: (task: TaskTableItem) => void;
  onOpen: (taskId: string) => void;
}

/**
 * One task as a stacked card for phones (< sm). Same cells as the desktop
 * table row, laid out top to bottom: title, owner, rewards, status + actions.
 */
export function MobileTaskCard({
  task,
  labels,
  isSolo,
  badgeVariant,
  isTeamMember,
  teamMembers,
  currentUserId,
  onAssignTask,
  onStartTask,
  onPreview,
  onOpen,
}: MobileTaskCardProps) {
  const coolingDown = isCoolingDown(task);

  return (
    <div
      className={cn(
        "space-y-3 p-4",
        task.is_confidential && "bg-red-500/[0.04]"
      )}
    >
      <TaskTitleCell task={task} />

      {!isSolo && (
        <TaskResponsibleCell
          task={task}
          isTeamMember={isTeamMember}
          teamMembers={teamMembers}
          onAssignTask={onAssignTask}
        />
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <DifficultyBadge level={DIFFICULTY_LEVEL[task.difficulty] ?? 1} />
        <span className="flex items-center gap-1.5">
          <Zap className="text-primary h-3.5 w-3.5" />
          <span className="font-medium tabular-nums">{task.xp ?? 0}</span>
          <span className="text-muted-foreground text-xs">{labels.xp}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CreditCard className="text-primary h-3.5 w-3.5" />
          <span className="font-medium tabular-nums">{task.points ?? 0}</span>
          <span className="text-muted-foreground text-xs">{labels.points}</span>
        </span>
      </div>

      {coolingDown && !task.phaseLocked ? (
        <TaskCooldownStatus task={task} />
      ) : (
        <div className="flex items-center justify-between gap-3">
          {task.phaseLocked ? (
            <PhaseLockedBadge />
          ) : (
            <StatusBadge
              status={toBadgeStatus(task.status)}
              variant={badgeVariant}
            />
          )}
          <div className="flex items-center gap-2 [&>button]:h-9 [&>button:last-child]:min-w-24">
            <TaskRowActions
              task={task}
              isTeamMember={isTeamMember}
              currentUserId={currentUserId}
              onStartTask={onStartTask}
              onPreview={onPreview}
              onOpen={onOpen}
            />
          </div>
        </div>
      )}
    </div>
  );
}
