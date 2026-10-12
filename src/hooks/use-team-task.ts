"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { checkTaskPermission, getTaskByIdLazy } from "@/lib/tasks";
import { peerReviewHistorySchema } from "@/lib/validation-schemas";

export interface TaskPermissions {
  canStart: boolean;
  canComplete: boolean;
  canCancel: boolean;
  canReassign: boolean;
  userRole: string;
  isAssignedUser: boolean;
}

const NO_PERMISSIONS: TaskPermissions = {
  canStart: false,
  canComplete: false,
  canCancel: false,
  canReassign: false,
  userRole: "unknown",
  isAssignedUser: false,
};

export interface ReassignCandidate {
  id: string;
  name: string;
  avatar_url?: string;
}

/**
 * Reads of the team task page: the task, the viewer's permissions on it
 * and, for leaders, the members it could be reassigned to. Same queries
 * and keys as the page carried inline before 2026-10-12.
 */
export function useTeamTask(taskId: string, userId: string | undefined) {
  const {
    data: task = null,
    isLoading: loading,
    refetch: refetchTask,
  } = useQuery({
    queryKey: ["task", taskId, userId],
    queryFn: () => getTaskByIdLazy(taskId, userId!),
    enabled: !!taskId && !!userId,
  });

  const parsed = peerReviewHistorySchema.safeParse(task?.peer_review_history);
  const reviewHistory = parsed.success ? parsed.data : [];
  if (!parsed.success && task?.peer_review_history) {
    console.error("Invalid peer_review_history on team task:", parsed.error);
  }

  const { data: permissions = NO_PERMISSIONS, refetch: refetchPermissions } =
    useQuery({
      queryKey: [
        "task",
        "permissions",
        task?.progress_id,
        task?.status,
        userId,
      ],
      queryFn: async (): Promise<TaskPermissions> => {
        if (!task?.progress_id || task.progress_id === "none") {
          return { ...NO_PERMISSIONS, canStart: true, userRole: "member" };
        }
        const [start, complete, cancel, reassign] = await Promise.all([
          checkTaskPermission(task.progress_id, userId!, "start"),
          checkTaskPermission(task.progress_id, userId!, "complete"),
          checkTaskPermission(task.progress_id, userId!, "cancel"),
          checkTaskPermission(task.progress_id, userId!, "reassign"),
        ]);
        return {
          canStart: start.canManage,
          canComplete: complete.canManage,
          canCancel: cancel.canManage,
          canReassign: reassign.canManage,
          userRole: start.userRole,
          isAssignedUser: start.isAssignedUser,
        };
      },
      enabled: !!task && !!userId,
    });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team", "members", task?.team_id],
    queryFn: async (): Promise<ReassignCandidate[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("team_members")
        .select("user_id, users!user_id(id, name, avatar_url)")
        .eq("team_id", task!.team_id!)
        .is("left_at", null);
      return (data ?? []).map((m: unknown) => {
        const { users } = m as {
          users: { id: string; name: string | null; avatar_url: string | null };
        };
        return {
          id: users.id,
          name: users.name || "Unknown",
          avatar_url: users.avatar_url || undefined,
        };
      });
    },
    enabled: !!task?.team_id && permissions.canReassign,
    staleTime: 2 * 60 * 1000,
  });

  return {
    task,
    loading,
    refetchTask,
    reviewHistory,
    permissions,
    refetchPermissions,
    teamMembers,
  };
}
