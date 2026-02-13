"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Medal,
  CheckCircle,
  Zap,
  CreditCard,
  Play,
  Loader2,
  Lock,
  RotateCcw,
  Clock,
  Eye,
} from "lucide-react";
import { TaskTableItem } from "@/types/team-journey";
import { useRouter } from "next/navigation";
import { mapUIStatusToBadge } from "@/lib/status-mapper";
import { TaskPreviewModal } from "./task-preview-modal";

interface TasksTableProps {
  tasks: TaskTableItem[];
  isTeamMember?: boolean;
  teamMembers?: Array<{ id: string; name: string; avatar: string }>;
  currentUserId?: string;
  onAssignTask?: (taskId: string, userId: string) => void;
  onStartTask?: (taskId: string) => void;
}

export function TasksTable({
  tasks,
  isTeamMember = false,
  teamMembers = [],
  currentUserId,
  onAssignTask,
  onStartTask,
}: TasksTableProps) {
  const router = useRouter();
  const [previewTask, setPreviewTask] = useState<TaskTableItem | null>(null);

  // Filter out any duplicate recurring tasks that may appear in regular task list

  return (
    <div>
      {/* Task Preview Modal */}
      <TaskPreviewModal
        isOpen={!!previewTask}
        onClose={() => setPreviewTask(null)}
        task={previewTask}
        onStartTask={onStartTask}
        canStart={isTeamMember && !!currentUserId && !!onStartTask}
      />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Task
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Responsible
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Difficulty
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                XP
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Points
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Status
              </th>
              <th className="text-muted-foreground px-4 py-4 text-right font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr
                key={task.id}
                className={`${
                  index < tasks.length - 1 ? "border-border border-b" : ""
                } hover:bg-muted/20 transition-all duration-200 hover:shadow-md ${
                  task.is_confidential ? "bg-red-50/50" : ""
                }`}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-md">
                      <Medal className="text-primary h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <div className="text-sm font-medium">{task.title}</div>
                        {task.isRecurring && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="secondary"
                                  className="flex items-center gap-1 bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800 hover:bg-blue-200"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" />
                                  Recurring
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  This task can be completed multiple times with
                                  a cooldown period
                                  {task.cooldownHours &&
                                    ` (${task.cooldownHours}h cooldown)`}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {task.is_confidential && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="destructive"
                                  className="flex items-center gap-1 px-1.5 py-0.5 text-xs"
                                >
                                  <Lock className="h-2.5 w-2.5" />
                                  Confidential
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  This task can only be reviewed by admin users
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {task.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {task.responsible ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={task.responsible.avatar}
                          alt={task.responsible.name}
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                          {task.responsible.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-xs font-medium">
                          {task.responsible.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {(() => {
                            try {
                              const date = new Date(task.responsible.date);
                              const day = String(date.getDate()).padStart(
                                2,
                                "0"
                              );
                              const month = String(
                                date.getMonth() + 1
                              ).padStart(2, "0");
                              const year = String(date.getFullYear()).slice(-2);
                              const hours = String(date.getHours()).padStart(
                                2,
                                "0"
                              );
                              const minutes = String(
                                date.getMinutes()
                              ).padStart(2, "0");
                              return `${day}-${month}-${year} ${hours}:${minutes}`;
                            } catch {
                              return task.responsible.date;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : isTeamMember && task.isAvailable ? (
                    <Select
                      onValueChange={(userId) => {
                        if (onAssignTask) {
                          onAssignTask(task.id, userId);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue placeholder="Choose Member" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback className="text-xs">
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span>{member.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : task.isAvailable === false ? (
                    <span className="text-muted-foreground text-sm">
                      Locked
                    </span>
                  ) : !isTeamMember ? (
                    <span className="text-muted-foreground text-sm">
                      Unassigned
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Choose Member
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <DifficultyBadge
                    level={
                      task.difficulty === "Easy"
                        ? 1
                        : task.difficulty === "Medium"
                          ? 2
                          : 3
                    }
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-black dark:text-white" />
                    <span className="text-sm font-medium">{task.xp}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-black dark:text-white" />
                    <span className="text-sm font-medium">{task.points}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {task.status === "Cooldown" &&
                  task.isRecurring &&
                  task.nextAvailableAt ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={mapUIStatusToBadge(task.status)}
                          variant="journey"
                        />
                        <span className="text-xs font-medium text-blue-600">
                          🔄
                        </span>
                      </div>
                      {task.nextAvailableAt &&
                        (() => {
                          const nextAvailable = new Date(task.nextAvailableAt);
                          const now = new Date();
                          const diffMs =
                            nextAvailable.getTime() - now.getTime();

                          if (diffMs <= 0) {
                            return (
                              <div className="flex items-center gap-1">
                                <span className="animate-pulse text-xs font-medium text-green-600">
                                  ✅ Available Now
                                </span>
                                <Button
                                  size="sm"
                                  className="h-6 bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600"
                                  onClick={() => window.location.reload()}
                                >
                                  Refresh
                                </Button>
                              </div>
                            );
                          }

                          // Calculate days, hours, and minutes more accurately
                          const diffMinutes = Math.floor(diffMs / (1000 * 60));
                          const diffDays = Math.floor(diffMinutes / (24 * 60));
                          const remainingMinutes = diffMinutes % (24 * 60);
                          const remainingHours = Math.floor(
                            remainingMinutes / 60
                          );
                          const finalMinutes = remainingMinutes % 60;

                          let timeText = "";
                          if (diffDays > 0) {
                            timeText = `${diffDays}d ${remainingHours}h`;
                          } else if (remainingHours > 0) {
                            timeText = `${remainingHours}h ${finalMinutes}m`;
                          } else {
                            timeText = `${finalMinutes}m`;
                          }

                          // Calculate progress percentage (assuming 7 days cooldown)
                          const totalCooldownMs = task.cooldownHours
                            ? task.cooldownHours * 60 * 60 * 1000
                            : 7 * 24 * 60 * 60 * 1000;
                          const elapsedMs = totalCooldownMs - diffMs;
                          const progressPercent = Math.max(
                            0,
                            Math.min(100, (elapsedMs / totalCooldownMs) * 100)
                          );

                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="w-full">
                                    <div className="mb-1 flex items-center justify-between">
                                      <span className="text-xs font-medium text-blue-600">
                                        🕒 {timeText} left
                                      </span>
                                      <span className="text-muted-foreground text-xs">
                                        {Math.round(progressPercent)}%
                                      </span>
                                    </div>
                                    <div className="h-1 w-full rounded-full bg-gray-200">
                                      <div
                                        className="h-1 rounded-full bg-blue-500 transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                      />
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-center">
                                    <p className="font-medium">
                                      Next Available:
                                    </p>
                                    <p>{nextAvailable.toLocaleString()}</p>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                      Cooldown Progress:{" "}
                                      {Math.round(progressPercent)}%
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
                    </div>
                  ) : (
                    <StatusBadge
                      status={
                        task.status === "Finished"
                          ? "approved"
                          : task.status === "Not Accepted"
                            ? "rejected"
                            : task.status === "Peer Review"
                              ? "pending_review"
                              : task.status === "In Progress"
                                ? "in_progress"
                                : "not_started"
                      }
                      variant="journey"
                    />
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    {(() => {
                      // Handle recurring tasks: distinguish between different states
                      const isNeverStartedRecurring =
                        task.isRecurring &&
                        task.status === "Not Started" &&
                        !task.responsible &&
                        task.recurringStatus === "never_completed" &&
                        !task.hasActiveInstance;

                      const isRecurringAvailableAfterCooldown =
                        task.isRecurring &&
                        task.nextAvailableAt &&
                        new Date(task.nextAvailableAt) <= new Date();

                      if (isNeverStartedRecurring) {
                        // Never started recurring task - show Preview + Start buttons
                        return (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="px-2 text-xs"
                                    onClick={() => setPreviewTask(task)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Preview task details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              size="sm"
                              className="bg-green-500 text-xs text-white hover:bg-green-600"
                              onClick={() => onStartTask?.(task.id)}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Start
                            </Button>
                          </>
                        );
                      }

                      if (isRecurringAvailableAfterCooldown) {
                        // Available after cooldown - show Preview + Start Again + View Info
                        return (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="px-2 text-xs"
                                    onClick={() => setPreviewTask(task)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Preview task details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              size="sm"
                              className="bg-green-500 text-xs text-white hover:bg-green-600"
                              onClick={() => onStartTask?.(task.id)}
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Start Again
                            </Button>
                            {task.id &&
                            task.id.toString().startsWith("temp-") ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="px-3 py-2 text-xs"
                                disabled
                              >
                                <Loader2 className="h-3 w-3 animate-spin" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#0000ff] px-3 py-2 text-xs text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/team-journey/task/${task.id}`
                                  )
                                }
                              >
                                View Info
                              </Button>
                            )}
                          </>
                        );
                      }

                      if (
                        task.status === "Finished" ||
                        (task.isRecurring && task.status === "Cooldown")
                      ) {
                        return (
                          <>
                            <Button
                              size="sm"
                              className={`${
                                task.isRecurring && task.status === "Cooldown"
                                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md hover:from-blue-600 hover:to-blue-700"
                                  : "bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                              } text-xs transition-all duration-200`}
                              disabled
                            >
                              {task.isRecurring && task.nextAvailableAt ? (
                                <>
                                  <Clock className="mr-1 h-3 w-3 animate-spin" />
                                  Cooldown
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Done
                                </>
                              )}
                            </Button>
                            {task.id &&
                            task.id.toString().startsWith("temp-") ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="px-3 py-2 text-xs"
                                disabled
                              >
                                <Loader2 className="h-3 w-3 animate-spin" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#0000ff] px-3 py-2 text-xs text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/team-journey/task/${task.id}`
                                  )
                                }
                              >
                                View Info
                              </Button>
                            )}
                          </>
                        );
                      }

                      // Return other task states (non-finished tasks)
                      return (
                        <>
                          {task.hasTips && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-2 text-xs text-[#ff78c8] hover:bg-[#ff78c8]/10"
                            >
                              Tips
                            </Button>
                          )}
                          {/* Show Preview + Start button for unassigned available tasks */}
                          {isTeamMember &&
                          task.isAvailable &&
                          !task.responsible &&
                          currentUserId &&
                          onStartTask ? (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="px-2 text-xs"
                                      onClick={() => setPreviewTask(task)}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Preview task details</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-[#ff78c8] px-3 py-2 text-xs text-white hover:bg-[#ff78c8]/90"
                                onClick={() => onStartTask(task.id)}
                              >
                                <Play className="mr-1 h-3 w-3" />
                                Start
                              </Button>
                            </>
                          ) : task.responsible ? (
                            // Task is assigned - everyone sees View Info button
                            task.id &&
                            task.id.toString().startsWith("temp-") ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="px-3 py-2 text-xs"
                                disabled
                              >
                                <Loader2 className="h-3 w-3 animate-spin" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-[#0000ff] px-3 py-2 text-xs text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/team-journey/task/${task.id}`
                                  )
                                }
                              >
                                View Info
                              </Button>
                            )
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
