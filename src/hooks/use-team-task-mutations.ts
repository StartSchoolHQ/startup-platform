"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { toast } from "sonner";
import { uploadTaskFiles } from "@/lib/file-upload";
import {
  cancelTask,
  completeTask,
  reassignTask,
  retryTask,
  startTask,
  startTaskLazy,
} from "@/lib/tasks";
import { invalidateNotifications } from "@/hooks/use-task-notifications";
import type { TeamTask } from "@/types/team-journey";

export interface TeamSubmission {
  description?: string;
  external_urls: Array<{ url: string; title: string; type: string }>;
  files: File[];
  submitted_at: string;
  [key: string]: unknown;
}

/**
 * The five writes of the team task page — start, submit, cancel, retry,
 * reassign — with the same RPCs, cache invalidations and events as before
 * 2026-10-12. Callers own the dialogs; `onReassigned` closes theirs.
 */
export function useTeamTaskMutations({
  taskId,
  task,
  userId,
  refetchTask,
  refetchPermissions,
  onSubmitted,
  onReassigned,
}: {
  taskId: string;
  task: TeamTask | null;
  userId: string | undefined;
  refetchTask: () => Promise<unknown>;
  refetchPermissions: () => Promise<unknown>;
  onSubmitted: () => void;
  onReassigned: () => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const taskKey = ["task", taskId, userId];
  const event = () => ({
    task_id: taskId,
    task_title: task?.title,
    task_category: task?.category,
    team_id: task?.team_id,
  });
  const invalidateTask = () => {
    queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    queryClient.invalidateQueries({ queryKey: ["task", "permissions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["teamJourney", "stats"] });
  };

  const start = useMutation({
    mutationFn: async () => {
      if (!task || !userId) throw new Error("Missing data");
      if (task.progress_id && task.progress_id !== "none") {
        await startTask(task.progress_id, userId);
      } else {
        await startTaskLazy(
          task.task_id,
          task.team_id || undefined,
          userId,
          "team"
        );
      }
    },
    retry: 0,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["task", taskId] });
      const previousTask = queryClient.getQueryData(taskKey);
      queryClient.setQueryData(taskKey, (old: any) =>
        old
          ? {
              ...old,
              status: "in_progress",
              started_at: new Date().toISOString(),
            }
          : old
      );
      return { previousTask };
    },
    onSuccess: async () => {
      posthog.capture("task_started", event());
      await refetchTask();
      await refetchPermissions();
      queryClient.invalidateQueries({ queryKey: ["teamJourney"] });
      toast.success("Task started");
    },
    onError: (error, _v, context) => {
      if (context?.previousTask)
        queryClient.setQueryData(taskKey, context.previousTask);
      console.error("Error starting task:", error);
      toast.error("Could not start the task", {
        description: "The request did not reach the server. Try again.",
      });
    },
  });

  const complete = useMutation({
    mutationFn: async (submission: TeamSubmission) => {
      if (!task?.progress_id || !userId) throw new Error("Missing data");
      // Team submissions keep storing file URLs as plain strings.
      const uploaded =
        submission.files.length > 0
          ? await uploadTaskFiles(submission.files, task.progress_id, userId)
          : [];
      await completeTask(task.progress_id, {
        ...submission,
        files: uploaded.map((u) => u.url),
        completed_by: userId,
        completion_date: new Date().toISOString(),
      });
    },
    retry: 0,
    onSuccess: async () => {
      posthog.capture("task_submitted", {
        ...event(),
        base_xp_reward: task?.base_xp_reward,
      });
      onSubmitted();
      await refetchTask();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["teamJourney", "stats"] });
      invalidateNotifications(queryClient, userId);
      toast.success("Submitted for peer review", {
        description:
          "A member of another team will review it. You'll be notified when they are done, usually within 2–3 days.",
        duration: 5000,
      });
    },
    onError: (error) => {
      posthog.capture("task_submission_failed", {
        ...event(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("Error completing task:", error);
      toast.error("Could not submit the task", {
        description:
          error instanceof Error
            ? error.message
            : "Check your connection and try again.",
      });
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      if (!task?.progress_id || !userId) throw new Error("Missing data");
      await cancelTask(task.progress_id, userId);
    },
    retry: 0,
    onSuccess: () => {
      posthog.capture("task_cancelled", event());
      toast.success("Task cancelled");
      invalidateTask();
      queryClient.invalidateQueries({ queryKey: ["teamJourney"] });
      const teamId = task?.team_id || task?.teams?.id;
      router.push(
        teamId ? `/dashboard/team-journey/${teamId}` : "/dashboard/team-journey"
      );
    },
    onError: (error) => {
      console.error("Error cancelling task:", error);
      toast.error("Could not cancel the task");
    },
  });

  const retry = useMutation({
    mutationFn: async () => {
      if (!task?.progress_id || !userId) throw new Error("Missing data");
      await retryTask(task.progress_id, userId);
    },
    retry: 0,
    onSuccess: () => {
      posthog.capture("task_retried", event());
      invalidateTask();
    },
    onError: (error) => {
      console.error("Error retrying task:", error);
      toast.error("Could not reopen the task");
    },
  });

  const reassign = useMutation({
    mutationFn: async (newUserId: string) => {
      if (!task?.progress_id || !userId) throw new Error("Missing data");
      await reassignTask(task.progress_id, newUserId, userId);
    },
    retry: 0,
    onSuccess: () => {
      posthog.capture("task_reassigned", event());
      onReassigned();
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["task", "permissions"] });
      toast.success("Task reassigned");
    },
    onError: (error) => {
      console.error("Error reassigning task:", error);
      toast.error("Could not reassign the task");
    },
  });

  return { start, complete, cancel, retry, reassign };
}
