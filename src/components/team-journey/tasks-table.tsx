"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { TaskTableItem } from "@/types/team-journey";
import { economyLabels, type Economy } from "@/lib/economy-labels";
import { TaskPreviewModal } from "./task-preview-modal";
import { TaskTitleCell } from "./tasks-table/title-cell";
import {
  TaskResponsibleCell,
  type TeamMemberOption,
} from "./tasks-table/responsible-cell";
import { TaskCooldownStatus } from "./tasks-table/cooldown-status";
import { TaskRowActions } from "./tasks-table/row-actions";
import { MobileTaskCard } from "./tasks-table/mobile-task-card";
import { PhaseLockedBadge } from "./tasks-table/phase-locked-badge";
import {
  DIFFICULTY_LEVEL,
  isCoolingDown,
  toBadgeStatus,
} from "./tasks-table/status";

interface TasksTableProps {
  tasks: TaskTableItem[];
  /** Which economy the rewards belong to — drives the reward column labels. */
  economy: Economy;
  isTeamMember?: boolean;
  teamMembers?: TeamMemberOption[];
  currentUserId?: string;
  onAssignTask?: (taskId: string, userId: string) => void;
  onStartTask?: (taskId: string) => void;
}

const TH =
  "text-muted-foreground px-4 py-3 text-left text-xs font-medium whitespace-nowrap";

/**
 * Task list shared by My Journey and Team Journey. The shell owns the table
 * chrome and the preview modal; the cells live in `./tasks-table/`.
 */
export function TasksTable({
  tasks,
  economy,
  isTeamMember = false,
  teamMembers = [],
  currentUserId,
  onAssignTask,
  onStartTask,
}: TasksTableProps) {
  const router = useRouter();
  const [previewTask, setPreviewTask] = useState<TaskTableItem | null>(null);
  const labels = economyLabels(economy);
  // Solo tasks have no assignee and live under their own detail route.
  const isSolo = economy === "my_journey";
  const taskDetailBase = isSolo
    ? "/dashboard/my-journey/task"
    : "/dashboard/team-journey/task";
  const badgeVariant = isSolo ? "my_journey" : "journey";

  return (
    <div>
      <TaskPreviewModal
        isOpen={!!previewTask}
        onClose={() => setPreviewTask(null)}
        task={previewTask}
        economy={economy}
        onStartTask={onStartTask}
        canStart={isTeamMember && !!currentUserId && !!onStartTask}
      />

      <div className="bg-card @container overflow-hidden rounded-xl border">
        {/* Narrow containers: stacked cards. The switch is on the list's own
            width (sidebar included), not the viewport — solo needs ~48rem,
            team ~56rem for its extra Responsible column. */}
        <div className={cn("divide-y", isSolo ? "@3xl:hidden" : "@4xl:hidden")}>
          {tasks.map((task) => (
            <MobileTaskCard
              key={task.id}
              task={task}
              labels={labels}
              isSolo={isSolo}
              badgeVariant={badgeVariant}
              isTeamMember={isTeamMember}
              teamMembers={teamMembers}
              currentUserId={currentUserId}
              onAssignTask={onAssignTask}
              onStartTask={onStartTask}
              onPreview={setPreviewTask}
              onOpen={(id) => router.push(`${taskDetailBase}/${id}`)}
            />
          ))}
        </div>

        <div
          className={cn(
            "hidden overflow-x-auto",
            isSolo ? "@3xl:block" : "@4xl:block"
          )}
        >
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr className="border-b">
                <th className={cn(TH, "w-full")}>Task</th>
                {!isSolo && <th className={TH}>Responsible</th>}
                <th className={TH}>Difficulty</th>
                <th className={TH}>{labels.xp}</th>
                <th className={TH}>{labels.points}</th>
                <th className={TH}>Status</th>
                <th className={cn(TH, "text-right")} aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.map((task) => {
                const coolingDown = isCoolingDown(task);

                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "hover:bg-muted/40 transition-colors",
                      task.is_confidential && "bg-red-500/[0.04]"
                    )}
                  >
                    <td className="px-4 py-3">
                      <TaskTitleCell task={task} />
                    </td>
                    {!isSolo && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TaskResponsibleCell
                          task={task}
                          isTeamMember={isTeamMember}
                          teamMembers={teamMembers}
                          onAssignTask={onAssignTask}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <DifficultyBadge
                        level={DIFFICULTY_LEVEL[task.difficulty] ?? 1}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-sm">
                        <Zap className="text-primary h-3.5 w-3.5" />
                        <span className="font-medium tabular-nums">
                          {task.xp ?? 0}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-sm">
                        <CreditCard className="text-primary h-3.5 w-3.5" />
                        <span className="font-medium tabular-nums">
                          {task.points ?? 0}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {task.phaseLocked ? (
                        <PhaseLockedBadge />
                      ) : coolingDown ? (
                        <TaskCooldownStatus task={task} />
                      ) : (
                        <StatusBadge
                          status={toBadgeStatus(task.status)}
                          variant={badgeVariant}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <TaskRowActions
                          task={task}
                          isTeamMember={isTeamMember}
                          currentUserId={currentUserId}
                          onStartTask={onStartTask}
                          onPreview={setPreviewTask}
                          onOpen={(id) =>
                            router.push(`${taskDetailBase}/${id}`)
                          }
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
