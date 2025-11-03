import {
  TeamTask,
  TaskTableItem,
  TaskStatus,
  TaskCategory,
  TaskPriority,
} from "@/types/team-journey";
import { createClient } from "@/lib/supabase/client";

// Function to convert database task to UI format for the simplified architecture
export function convertTeamTaskToTableItem(task: TeamTask): TaskTableItem {
  // Map database status to UI status
  const getUIStatus = (status: TaskStatus): TaskTableItem["status"] => {
    switch (status) {
      case "approved":
        return "Finished";
      case "in_progress":
        return "In Progress";
      case "rejected":
      case "revision_required":
        return "Not Accepted";
      case "pending_review":
        return "Peer Review";
      case "not_started":
      default:
        return "Not Started";
    }
  };

  // Map difficulty level to UI difficulty
  const getDifficulty = (level: number): TaskTableItem["difficulty"] => {
    if (level >= 4) return "Hard";
    if (level >= 3) return "Medium";
    return "Easy";
  };

  return {
    id: task.progress_id, // Use progress_id as the main ID for UI
    title: task.title,
    description: task.description,
    responsible: task.assignee_name
      ? {
          name: task.assignee_name,
          avatar: task.assignee_avatar_url || "/avatars/john-doe.jpg",
          date: task.assigned_at
            ? new Date(task.assigned_at).toLocaleDateString()
            : "",
        }
      : undefined,
    difficulty: getDifficulty(task.difficulty_level),
    xp: task.base_xp_reward,
    points: task.base_xp_reward,
    status: getUIStatus(task.status),
    action: task.status === "approved" ? "done" : "complete",
    isAvailable: task.is_available,
  };
}

// Fetch team tasks using the new simplified architecture
export async function getTeamTasks(teamId: string): Promise<TaskTableItem[]> {
  try {
    const supabase = createClient();

    // Use the new simplified function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_team_tasks_simple",
      { p_team_id: teamId }
    );

    if (error) {
      console.error("Error fetching team tasks:", error);
      return [];
    }

    // Convert raw data to TeamTask format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tasks: TeamTask[] = (data || []).map((row: any) => ({
      progress_id: row.progress_id,
      task_id: row.task_id,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      difficulty_level: row.difficulty_level,
      base_xp_reward: row.base_xp_reward,
      status: row.status,
      assigned_to_user_id: row.assigned_to_user_id,
      assignee_name: row.assignee_name,
      assignee_avatar_url: row.assignee_avatar_url,
      assigned_at: row.assigned_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      is_available: row.is_available,
      detailed_instructions: row.detailed_instructions,
      tips_content: row.tips_content,
      peer_review_criteria: row.peer_review_criteria,
      learning_objectives: row.learning_objectives,
      deliverables: row.deliverables,
      resources: row.resources,
      // Backwards compatibility
      id: row.progress_id,
      xp_reward: row.base_xp_reward,
    }));

    return tasks.map(convertTeamTaskToTableItem);
  } catch (error) {
    console.error("Error in getTeamTasks:", error);
    return [];
  }
}

// Assign a task to a team member using the new architecture
export async function assignTaskToMember(
  progressId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "assign_user_to_task_simple",
      {
        p_progress_id: progressId,
        p_user_id: userId,
      }
    );

    if (error) {
      console.error("Error assigning task:", error);
      return false;
    }

    return data?.[0]?.success || false;
  } catch (error) {
    console.error("Error in assignTaskToMember:", error);
    return false;
  }
}

// Fetch user's assigned tasks (for My Journey page)
export async function getUserTasks(userId: string): Promise<TaskTableItem[]> {
  try {
    const supabase = createClient();

    // Use SQL query to fetch user tasks with peer review feedback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_user_tasks_with_feedback",
      {
        p_user_id: userId,
      }
    );

    if (error) {
      console.error("Error fetching user tasks:", error);
      return [];
    }

    // Convert to TaskTableItem format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (data || []).map((row: any) => {
      const getUIStatus = (status: TaskStatus): TaskTableItem["status"] => {
        switch (status) {
          case "approved":
            return "Finished";
          case "in_progress":
            return "In Progress";
          case "rejected":
          case "revision_required":
            return "Not Accepted";
          case "pending_review":
            return "Peer Review";
          case "not_started":
          default:
            return "Not Started";
        }
      };

      const getDifficulty = (level: number): TaskTableItem["difficulty"] => {
        if (level >= 4) return "Hard";
        if (level >= 3) return "Medium";
        return "Easy";
      };

      return {
        id: row.progress_id,
        title: row.title,
        description: row.description,
        difficulty: getDifficulty(row.difficulty_level),
        xp: row.base_xp_reward,
        points: row.base_credits_reward || row.base_xp_reward,
        status: getUIStatus(row.status),
        action: row.status === "approved" ? "done" : "complete",
        isAvailable: true,
        // Add additional data for showing peer review feedback
        reviewFeedback: row.peer_review_feedback,
        reviewerName: row.reviewer_name,
        reviewerAvatarUrl: row.reviewer_avatar_url,
        teamName: row.team_name,
        assignedAt: row.assigned_at,
        completedAt: row.completed_at,
      };
    });

    return result;
  } catch (error) {
    console.error("Error in getUserTasks:", error);
    return [];
  }
}

// Get a single task by progress ID
export async function getTaskById(
  progressId: string
): Promise<TeamTask | null> {
  try {
    const supabase = createClient();

    // Fetch task_progress data first (no foreign key relationships to avoid 406 errors)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: progressData, error: progressError } = await (supabase as any)
      .from("task_progress")
      .select(
        `
        id,
        task_id,
        team_id,
        assigned_to_user_id,
        assigned_at,
        status,
        started_at,
        completed_at,
        updated_at,
        submission_data,
        submission_notes,
        reviewer_user_id,
        context
      `
      )
      .eq("id", progressId)
      .single();

    if (progressError) {
      console.error("Error fetching task progress:", progressError);
      return null;
    }

    if (!progressData) return null;

    // Manually fetch task data
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select(
        `
        title,
        description,
        category,
        priority,
        difficulty_level,
        base_xp_reward,
        detailed_instructions,
        tips_content,
        peer_review_criteria,
        learning_objectives,
        deliverables,
        resources
      `
      )
      .eq("id", progressData.task_id)
      .single();

    if (taskError || !taskData) {
      console.error("Error fetching task data:", taskError);
      return null;
    }

    // Manually fetch team data if team context
    let teamData = null;
    if (progressData.team_id && progressData.context === "team") {
      const { data: team } = await supabase
        .from("teams")
        .select("id, name")
        .eq("id", progressData.team_id)
        .single();
      teamData = team;
    }

    // Manually fetch assignee user data if exists
    let assigneeData = null;
    if (progressData.assigned_to_user_id) {
      const { data: user } = await supabase
        .from("users")
        .select("name, avatar_url")
        .eq("id", progressData.assigned_to_user_id)
        .single();
      assigneeData = user;
    }

    // Manually fetch reviewer user data if exists
    let reviewerData = null;
    if (progressData.reviewer_user_id) {
      const { data: reviewer } = await supabase
        .from("users")
        .select("name, avatar_url")
        .eq("id", progressData.reviewer_user_id)
        .single();
      reviewerData = reviewer;
    }

    // Transform the data to match our TeamTask interface
    const task: TeamTask = {
      progress_id: progressData.id,
      task_id: progressData.task_id,
      title: taskData.title,
      description: (taskData.description ?? "") as string,
      category: (taskData.category ?? "development") as TaskCategory,
      priority: (taskData.priority ?? "medium") as TaskPriority,
      difficulty_level: (taskData.difficulty_level ?? 1) as number,
      base_xp_reward: (taskData.base_xp_reward ?? 0) as number,
      status: progressData.status as TaskStatus,
      assigned_to_user_id: progressData.assigned_to_user_id ?? undefined,
      assignee_name: assigneeData?.name ?? undefined,
      assignee_avatar_url: assigneeData?.avatar_url ?? undefined,
      assigned_at: progressData.assigned_at ?? undefined,
      started_at: progressData.started_at ?? undefined,
      completed_at: progressData.completed_at ?? undefined,
      updated_at: progressData.updated_at,
      submission_notes: progressData.submission_notes ?? undefined,
      is_available:
        progressData.status !== "completed" &&
        progressData.status !== "approved",
      reviewer_user_id: progressData.reviewer_user_id ?? undefined,
      reviewer_name: reviewerData?.name ?? undefined,
      reviewer_avatar_url: reviewerData?.avatar_url ?? undefined,
      detailed_instructions: taskData.detailed_instructions ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tips_content: (taskData.tips_content as any) ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      peer_review_criteria: (taskData.peer_review_criteria as any) ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      learning_objectives: (taskData.learning_objectives as any) ?? undefined,
      deliverables: taskData.deliverables ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resources: (taskData.resources as any) ?? undefined,
      // Backwards compatibility
      id: progressData.id,
      xp_reward: (taskData.base_xp_reward ?? 0) as number,
      team_id: progressData.team_id ?? undefined,
      teams: teamData
        ? {
            id: teamData.id,
            name: teamData.name,
          }
        : undefined,
    };

    return task;
  } catch (error) {
    console.error("Error in getTaskById:", error);
    return null;
  }
}

// Permission checking function
export async function checkTaskPermission(
  progressId: string,
  userId: string,
  action: "start" | "complete" | "cancel" | "reassign"
): Promise<{ canManage: boolean; userRole: string; isAssignedUser: boolean }> {
  try {
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "user_can_manage_task",
      {
        p_progress_id: progressId,
        p_user_id: userId,
        p_action: action,
      }
    );

    if (error) {
      console.error("Error checking task permission:", error);
      return { canManage: false, userRole: "unknown", isAssignedUser: false };
    }

    const result = data?.[0] || {};
    return {
      canManage: result.can_manage || false,
      userRole: result.user_role || "unknown",
      isAssignedUser: result.is_assigned_user || false,
    };
  } catch (error) {
    console.error("Error in checkTaskPermission:", error);
    return { canManage: false, userRole: "unknown", isAssignedUser: false };
  }
}

// Reassign task function
export async function reassignTask(
  progressId: string,
  newUserId: string,
  reassignedByUserId: string
): Promise<boolean> {
  try {
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("reassign_task", {
      p_progress_id: progressId,
      p_new_user_id: newUserId,
      p_reassigned_by_user_id: reassignedByUserId,
    });

    if (error) {
      console.error("Error reassigning task:", error);
      return false;
    }

    return data?.[0]?.success || false;
  } catch (error) {
    console.error("Error in reassignTask:", error);
    return false;
  }
}

// Task action functions for the workflow
export async function startTask(
  progressId: string,
  userId: string
): Promise<boolean> {
  try {
    // Check permission first
    const permission = await checkTaskPermission(progressId, userId, "start");
    if (!permission.canManage) {
      console.error("User does not have permission to start this task");
      return false;
    }

    const supabase = createClient();

    // First assign the task to the user, then update status
    await assignTaskToMember(progressId, userId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("update_task_status", {
      p_progress_id: progressId,
      p_status: "in_progress",
    });

    if (error) {
      console.error("Error starting task:", error);
      return false;
    }

    return data?.[0]?.success || false;
  } catch (error) {
    console.error("Error in startTask:", error);
    return false;
  }
}

export async function completeTask(
  progressId: string,
  submissionData: Record<string, unknown>
): Promise<boolean> {
  try {
    // Check permission first
    const userId = submissionData.completed_by as string;
    if (userId) {
      const permission = await checkTaskPermission(
        progressId,
        userId,
        "complete"
      );
      if (!permission.canManage) {
        console.error("User does not have permission to complete this task");
        return false;
      }
    }

    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("update_task_status", {
      p_progress_id: progressId,
      p_status: "pending_review",
      p_submission_data: JSON.stringify(submissionData),
      p_submission_notes: submissionData.notes as string,
    });

    if (error) {
      console.error("Error completing task:", error);
      return false;
    }

    return data?.[0]?.success || false;
  } catch (error) {
    console.error("Error in completeTask:", error);
    return false;
  }
}

export async function cancelTask(
  progressId: string,
  userId: string
): Promise<boolean> {
  try {
    // Check permission first
    const permission = await checkTaskPermission(progressId, userId, "cancel");
    if (!permission.canManage) {
      console.error("User does not have permission to cancel this task");
      return false;
    }

    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("update_task_status", {
      p_progress_id: progressId,
      p_status: "cancelled",
    });

    if (error) {
      console.error("Error cancelling task:", error);
      return false;
    }

    return data?.[0]?.success || false;
  } catch (error) {
    console.error("Error in cancelTask:", error);
    return false;
  }
}

export async function retryTask(
  progressId: string,
  userId: string
): Promise<boolean> {
  try {
    // Check permission first
    const permission = await checkTaskPermission(progressId, userId, "start");
    if (!permission.canManage) {
      console.error("User does not have permission to retry this task");
      return false;
    }

    const supabase = createClient();

    // Reset to in_progress and assign to user
    await assignTaskToMember(progressId, userId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("update_task_status", {
      p_progress_id: progressId,
      p_status: "in_progress",
    });

    if (error) {
      console.error("Error retrying task:", error);
      return false;
    }

    return data?.[0]?.success || false;
  } catch (error) {
    console.error("Error in retryTask:", error);
    return false;
  }
}
