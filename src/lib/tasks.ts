import {
  TeamTask,
  TaskTableItem,
  AdminTaskItem,
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

// ============================================================================
// NEW VISIBLE TASK FUNCTIONS (Phase 1 - Lazy Progress Model)
// ============================================================================

// Fetch team tasks using the new visible architecture (alongside existing getTeamTasks)
export async function getTeamTasksVisible(
  teamId: string
): Promise<TaskTableItem[]> {
  try {
    const supabase = createClient();

    // Use the new visible function that shows ALL tasks with lazy progress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_team_tasks_visible",
      { p_team_id: teamId }
    );

    if (error) {
      console.error("Error fetching team tasks visible:", error);
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
      status: row.display_status,
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
      id: row.progress_id || `temp-${row.task_id}`, // Use task_id if no progress yet
      xp_reward: row.base_xp_reward,
    }));

    return tasks.map(convertTeamTaskToTableItem);
  } catch (error) {
    console.error("Error in getTeamTasksVisible:", error);
    return [];
  }
}

// Fetch user tasks using the new visible architecture (alongside existing getUserTasks)
export async function getUserTasksVisible(
  userId: string
): Promise<TaskTableItem[]> {
  try {
    const supabase = createClient();

    // Use the new visible function that shows ALL individual tasks with lazy progress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_user_tasks_visible",
      {
        p_user_id: userId,
      }
    );

    if (error) {
      console.error("Error fetching user tasks visible:", error);
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
        id: row.progress_id || `temp-${row.task_id}`, // Use task_id if no progress yet
        title: row.title,
        description: row.description,
        difficulty: getDifficulty(row.difficulty_level),
        xp: row.base_xp_reward,
        points: row.base_xp_reward,
        status: getUIStatus(row.display_status),
        action: row.display_status === "approved" ? "done" : "complete",
        isAvailable: row.is_available,
      };
    });

    return result;
  } catch (error) {
    console.error("Error in getUserTasksVisible:", error);
    return [];
  }
}

// Helper function to create progress entry if needed (lazy creation)
export async function createProgressIfNeeded(
  taskId: string,
  teamId?: string,
  userId?: string,
  context: "team" | "individual" = "team"
): Promise<string | null> {
  try {
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "create_progress_if_needed_v2",
      {
        p_task_id: taskId,
        p_team_id: teamId || null,
        p_user_id: userId || null,
        p_context: context,
      }
    );

    if (error) {
      console.error("Error creating progress if needed:", error);
      return null;
    }

    return data; // Returns the progress_id
  } catch (error) {
    console.error("Error in createProgressIfNeeded:", error);
    return null;
  }
}

// Enhanced task starting with lazy progress creation
export async function startTaskLazy(
  taskId: string,
  teamId?: string,
  userId?: string,
  context: "team" | "individual" = "team"
): Promise<boolean> {
  try {
    // First ensure progress entry exists
    // For team context: pass teamId but NOT userId (constraint requirement)
    // For individual context: pass userId but NOT teamId (constraint requirement)
    const progressId = await createProgressIfNeeded(
      taskId,
      context === "team" ? teamId : undefined,
      context === "individual" ? userId : undefined,
      context
    );

    if (!progressId) {
      console.error("Failed to create/find progress entry");
      return false;
    }

    // Now start the task using existing startTask function
    return await startTask(progressId, userId || "");
  } catch (error) {
    console.error("Error in startTaskLazy:", error);
    return false;
  }
}

// Assign a task to a team member using the new lazy progress architecture
export async function assignTaskToMember(
  taskIdOrProgressId: string,
  userId: string,
  teamId?: string
): Promise<boolean> {
  console.log("assignTaskToMember called with:", {
    taskIdOrProgressId,
    userId,
    teamId,
  });

  try {
    const supabase = createClient();

    // First, check if this is a task_id (new task) or progress_id (existing task)
    // Try to find existing progress entry first
    const { data: existingProgress } = await supabase
      .from("task_progress")
      .select("id, task_id")
      .eq("id", taskIdOrProgressId)
      .maybeSingle(); // Use maybeSingle to avoid errors when not found

    let progressId: string;

    if (existingProgress) {
      // This is already a progress_id
      console.log("Using existing progress ID:", existingProgress.id);
      progressId = taskIdOrProgressId;
    } else {
      // Check if this is a temporary ID (temp-{task_id})
      let actualTaskId = taskIdOrProgressId;
      if (taskIdOrProgressId.startsWith("temp-")) {
        actualTaskId = taskIdOrProgressId.replace("temp-", "");
      }

      // This might be a task_id, try to find if it's a valid task
      const { data: task } = await supabase
        .from("tasks")
        .select("id")
        .eq("id", actualTaskId)
        .single();

      if (!task) {
        console.error("Invalid task_id or progress_id:", actualTaskId);
        return false;
      }

      // Use the actual task ID for the rest of the function
      taskIdOrProgressId = actualTaskId;

      // This is a task_id, create progress entry first if needed
      console.log("Creating progress entry for task_id:", taskIdOrProgressId);

      if (!teamId) {
        console.error("Team ID required for new task assignment");
        return false;
      }

      const createdProgressId = await createProgressIfNeeded(
        taskIdOrProgressId, // task_id
        teamId,
        undefined, // user_id should be null for team context
        "team"
      );

      if (!createdProgressId) {
        console.error("Failed to create progress entry for assignment");
        return false;
      }

      console.log("Created progress ID:", createdProgressId);
      progressId = createdProgressId;
    }

    // Now assign using the progress_id
    console.log("Assigning progress_id to user:", { progressId, userId });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "assign_user_to_task_simple",
      {
        p_progress_id: progressId,
        p_user_id: userId,
      }
    );

    if (error) {
      console.error("Error in assign_user_to_task_simple:", error);
      return false;
    }

    console.log("Assignment result:", data);
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
// NEW: Lazy progress compatible version - handles both task_id and progress_id
export async function getTaskByIdLazy(
  taskIdOrProgressId: string,
  userId: string,
  teamId?: string
): Promise<TeamTask | null> {
  try {
    const supabase = createClient();

    // First, try to find if it's a progress_id
    const { data: existingProgress } = await supabase
      .from("task_progress")
      .select("id, task_id, team_id, user_id, context")
      .eq("id", taskIdOrProgressId)
      .maybeSingle();

    let actualTaskId: string;
    let progressId: string | undefined;

    // Check if this is a temporary ID (temp-{task_id})
    if (taskIdOrProgressId.startsWith("temp-")) {
      actualTaskId = taskIdOrProgressId.replace("temp-", "");
      progressId = undefined; // No progress exists yet for temp IDs

      // Validate the extracted task_id exists
      const { data: taskExists } = await supabase
        .from("tasks")
        .select("id")
        .eq("id", actualTaskId)
        .single();

      if (!taskExists) {
        console.error("Invalid task_id from temp ID:", actualTaskId);
        return null;
      }
    } else if (existingProgress) {
      // This is a progress_id
      actualTaskId = existingProgress.task_id;
      progressId = taskIdOrProgressId;
    } else {
      // This might be a task_id - validate it exists
      const { data: taskExists } = await supabase
        .from("tasks")
        .select("id")
        .eq("id", taskIdOrProgressId)
        .single();

      if (!taskExists) {
        console.error("Invalid task_id or progress_id:", taskIdOrProgressId);
        return null;
      }

      actualTaskId = taskIdOrProgressId;
      progressId = undefined; // No progress exists yet
    }

    // Fetch the task data
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        description,
        category,
        priority,
        difficulty_level,
        base_xp_reward,
        base_points_reward,
        detailed_instructions,
        tips_content,
        peer_review_criteria,
        learning_objectives,
        deliverables,
        resources,
        submission_form_schema,
        requires_review,
        review_instructions,
        activity_type
      `
      )
      .eq("id", actualTaskId)
      .single();

    if (taskError || !taskData) {
      console.error("Error fetching task:", taskError);
      return null;
    }

    // Fetch progress data if it exists
    let progressData: any = null;
    if (progressId) {
      const { data: progress } = await supabase
        .from("task_progress")
        .select(
          `
          id,
          task_id,
          team_id,
          user_id,
          assigned_to_user_id,
          assigned_at,
          status,
          started_at,
          completed_at,
          updated_at,
          submission_data,
          submission_notes,
          reviewer_user_id,
          context,
          activity_type
        `
        )
        .eq("id", progressId)
        .single();

      progressData = progress;
    }

    // Build the TeamTask object
    const task: TeamTask = {
      progress_id: progressId || "none", // Use "none" for tasks without progress yet
      task_id: actualTaskId,
      title: taskData.title,
      description: taskData.description || "",
      category: taskData.category,
      priority: taskData.priority,
      difficulty_level: taskData.difficulty_level || 1,
      base_xp_reward: taskData.base_xp_reward || 0,
      detailed_instructions: taskData.detailed_instructions,
      tips_content: taskData.tips_content,
      peer_review_criteria: taskData.peer_review_criteria,
      learning_objectives: taskData.learning_objectives,
      deliverables: taskData.deliverables,
      resources: taskData.resources,
      submission_form_schema: taskData.submission_form_schema,

      // Progress-specific fields (null if no progress exists)
      team_id: progressData?.team_id || teamId || null,
      assigned_to_user_id: progressData?.assigned_to_user_id || null,
      assigned_at: progressData?.assigned_at || null,
      status: progressData?.status || "not_started",
      started_at: progressData?.started_at || null,
      completed_at: progressData?.completed_at || null,
      updated_at: progressData?.updated_at || taskData.created_at,
      submission_data: progressData?.submission_data || null,
      submission_notes: progressData?.submission_notes || null,
      reviewer_user_id: progressData?.reviewer_user_id || null,

      // Computed fields
      base_credits_reward:
        taskData.base_points_reward || taskData.base_xp_reward || 0,
      requires_review: taskData.requires_review || false,
      review_instructions: taskData.review_instructions,

      // Additional fields for UI
      assignee_name: null, // Will be populated separately if needed
      assignee_avatar_url: null,
      reviewer_name: null,
      reviewer_avatar_url: null,
    };

    // Populate assignee info if task is assigned
    if (task.assigned_to_user_id) {
      const { data: assigneeData } = await supabase
        .from("users")
        .select("name, avatar_url")
        .eq("id", task.assigned_to_user_id)
        .single();

      if (assigneeData) {
        task.assignee_name = assigneeData.name;
        task.assignee_avatar_url = assigneeData.avatar_url;
      }
    }

    // Populate reviewer info if task has reviewer
    if (task.reviewer_user_id) {
      const { data: reviewerData } = await supabase
        .from("users")
        .select("name, avatar_url")
        .eq("id", task.reviewer_user_id)
        .single();

      if (reviewerData) {
        task.reviewer_name = reviewerData.name;
        task.reviewer_avatar_url = reviewerData.avatar_url;
      }
    }

    return task;
  } catch (error) {
    console.error("Error in getTaskByIdLazy:", error);
    return null;
  }
}

// LEGACY: Keep old function for backward compatibility
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

// Get all tasks for admin management (separated by activity_type)
export async function getAllTasks(
  activityType?: "individual" | "team",
  sortBy?:
    | "created_at"
    | "title"
    | "priority"
    | "difficulty_level"
    | "category",
  sortOrder?: "asc" | "desc"
): Promise<AdminTaskItem[]> {
  try {
    const supabase = createClient();

    let query = supabase
      .from("tasks")
      .select(
        `
        id,
        title,
        description,
        category,
        priority,
        difficulty_level,
        base_xp_reward,
        base_points_reward,
        activity_type,
        created_at,
        updated_at
      `
      )
      .order(sortBy || "created_at", { ascending: sortOrder === "asc" });

    if (activityType) {
      query = query.eq("activity_type", activityType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching all tasks:", error);
      return [];
    }

    return (
      data?.map(
        (task): AdminTaskItem => ({
          id: task.id,
          title: task.title,
          description: task.description || "",
          difficulty: (task.difficulty_level === 1
            ? "Easy"
            : task.difficulty_level === 2
            ? "Medium"
            : "Hard") as "Easy" | "Medium" | "Hard",
          xp: task.base_xp_reward || 0,
          points: task.base_points_reward || task.base_xp_reward || 0,
          status: "Not Started" as AdminTaskItem["status"],
          action: "complete" as "complete" | "done",
          // Admin-specific additional fields
          category: task.category,
          priority: task.priority,
          activity_type: task.activity_type,
          created_at: task.created_at,
          updated_at: task.updated_at || task.created_at,
          difficulty_level: task.difficulty_level || 1,
        })
      ) || []
    );
  } catch (error) {
    console.error("Error in getAllTasks:", error);
    return [];
  }
}
