"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getTeamTasksVisible } from "@/lib/database";
import { assignTaskToMember, startTask, startTaskLazy } from "@/lib/tasks";
import type { TeamDetailTask } from "@/lib/team-journey/detail-transforms";
import type { TeamDetailMember } from "@/hooks/use-team-detail";

interface Actor {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

/**
 * Assign and start mutations of the team page with their optimistic
 * updates, unchanged from the inline versions before 2026-10-12 except
 * that feedback is a toast instead of a tinted box above the table.
 */
export function useTeamTaskActions({
  teamId,
  teamName,
  user,
  members,
  tasks,
}: {
  teamId: string;
  teamName: string;
  user: Actor | null;
  members: TeamDetailMember[];
  tasks: TeamDetailTask[];
}) {
  const queryClient = useQueryClient();
  const achievementsKey = ["teamJourney", "achievements", teamId, user?.id];

  const findTask = (id: string) =>
    tasks.find((t) => t.progress_id === id || t.task_id === id);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: achievementsKey });
    queryClient.invalidateQueries({ queryKey: ["task", "permissions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const assign = useMutation({
    mutationFn: async ({
      taskId,
      userId,
    }: {
      taskId: string;
      userId: string;
    }) => {
      await assignTaskToMember(taskId, userId, teamId);
      if (userId !== user?.id) {
        fetch("/api/notifications/task-assigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assigneeId: userId,
            taskTitle: findTask(taskId)?.title,
            teamId,
            teamName,
          }),
        }).catch(console.error);
      }
    },
    retry: 0,
    onMutate: async ({ taskId, userId }) => {
      await queryClient.cancelQueries({ queryKey: achievementsKey });
      const previousData = queryClient.getQueryData(achievementsKey);
      const member = members.find((m) => m.user_id === userId);
      queryClient.setQueryData(achievementsKey, (old: any) =>
        old
          ? {
              ...old,
              tasks: old.tasks.map((task: any) =>
                task.task_id === taskId || task.progress_id === taskId
                  ? {
                      ...task,
                      assigned_to_user_id: userId,
                      assignee_name: member?.users?.name || undefined,
                      assignee_avatar_url:
                        member?.users?.avatar_url || undefined,
                      assigned_at: new Date().toISOString(),
                    }
                  : task
              ),
            }
          : old
      );
      return { previousData };
    },
    onError: (err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(achievementsKey, context.previousData);
      }
      console.error("Error assigning task:", err);
      toast.error("Could not assign the task", {
        description: "The change did not reach the server. Try again.",
      });
    },
    onSettled: invalidate,
  });

  const start = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      if (!user?.id) throw new Error("User not found");
      const task = findTask(taskId);
      const isRecurringTask = task?.is_recurring === true;
      const isNewTask =
        isRecurringTask || !tasks.find((t) => t.progress_id === taskId);
      const actualTaskId = isRecurringTask
        ? task?.task_id || taskId
        : isNewTask
          ? taskId
          : tasks.find((t) => t.progress_id === taskId)?.task_id || taskId;

      if (isNewTask) {
        await startTaskLazy(actualTaskId, teamId, user.id, "team");
      } else {
        await startTask(taskId, user.id);
      }
      return { isNewTask, isRecurringTask, actualTaskId, task };
    },
    retry: 0,
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: achievementsKey });
      const previousData = queryClient.getQueryData(achievementsKey);
      const tempProgressId = `temp-${Date.now()}`;
      const me = members.find((m) => m.user_id === user?.id);
      queryClient.setQueryData(achievementsKey, (old: any) =>
        old
          ? {
              ...old,
              tasks: old.tasks.map((task: any) =>
                task.progress_id === taskId || task.task_id === taskId
                  ? {
                      ...task,
                      assigned_to_user_id: user?.id,
                      assignee_name: me?.users?.name || user?.name || "You",
                      assignee_avatar_url:
                        me?.users?.avatar_url || user?.avatar_url || undefined,
                      assigned_at: new Date().toISOString(),
                      started_at: new Date().toISOString(),
                      status: "in_progress" as const,
                      progress_id: task.progress_id || tempProgressId,
                    }
                  : task
              ),
            }
          : old
      );
      return { previousData, tempProgressId };
    },
    onSuccess: (data, _vars, context) => {
      toast.success(`Started: ${data.task?.title || "Task"}`);
      if (!data.isNewTask) return;
      // Swap the temporary progress id for the real one once the row exists.
      setTimeout(async () => {
        try {
          const fresh = await getTeamTasksVisible(teamId, user?.id);
          const row = fresh.find(
            (t: any) =>
              t.task_id === data.actualTaskId &&
              t.assigned_to_user_id === user?.id
          );
          if (row?.progress_id) {
            queryClient.setQueryData(achievementsKey, (old: any) =>
              old
                ? {
                    ...old,
                    tasks: old.tasks.map((task: any) =>
                      task.progress_id === context?.tempProgressId &&
                      task.task_id === data.actualTaskId
                        ? { ...task, progress_id: row.progress_id }
                        : task
                    ),
                  }
                : old
            );
          }
        } catch {
          queryClient.invalidateQueries({ queryKey: achievementsKey });
        }
      }, 500);
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(achievementsKey, context.previousData);
      }
      console.error("Error starting task:", err);
      toast.error(
        `Could not start: ${findTask(variables.taskId)?.title || "task"}`,
        {
          description: "The request did not reach the server. Try again.",
        }
      );
    },
    onSettled: invalidate,
  });

  return { assign, start };
}
