/**
 * Task Management Functions
 *
 * Handles:
 * - Individual task operations
 * - Team task operations
 * - Task CRUD (create, read, update, delete)
 * - Task visibility and assignment
 * - Task completion statistics
 */

import { createClient } from "../supabase/client";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Get user task completion statistics
 */
export async function getUserTaskCompletionStats(userId: string) {
  const supabase = createClient();

  const { data: stats, error } = await supabase
    .from("task_progress")
    .select("status")
    .or(`user_id.eq.${userId},assigned_to_user_id.eq.${userId}`);

  if (error) {
    throw error;
  }

  const taskStats = stats || [];
  const total = taskStats.length;
  const completed = taskStats.filter(
    (task) => task.status === "approved" || task.status === "completed"
  ).length;

  return {
    total,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Get all individual tasks for a user
 */
export async function getUserIndividualTasks(userId: string) {
  const supabase = createClient();

  const { data, error } = await (supabase as any).rpc(
    "get_user_individual_tasks",
    {
      p_user_id: userId,
    }
  );

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Assign an individual task to a user
 */
export async function assignIndividualTask(userId: string, taskId: string) {
  const supabase = createClient();

  const { data, error } = await (supabase as any).rpc(
    "assign_individual_task",
    {
      p_user_id: userId,
      p_task_id: taskId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Start an individual task
 */
export async function startIndividualTask(progressId: string) {
  const supabase = createClient();

  const { data, error } = await (supabase as any).rpc("start_individual_task", {
    p_progress_id: progressId,
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Complete an individual task and award points
 */
export async function completeIndividualTask(
  progressId: string,
  submissionData?: Record<string, unknown>,
  submissionNotes?: string
) {
  const supabase = createClient();

  const { data, error } = await (supabase as any).rpc(
    "complete_individual_task",
    {
      p_progress_id: progressId,
      p_submission_data: submissionData as Json | undefined,
      p_submission_notes: submissionNotes,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get team tasks from task_progress table
 */
export async function getTeamTasksFromProgress(teamId: string) {
  const supabase = createClient();

  const { data, error } = await (supabase as any).rpc(
    "get_team_tasks_from_progress",
    {
      p_team_id: teamId,
    }
  );

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Assign a task to a team using task_progress table
 */
export async function assignTeamTaskToProgress(
  progressId: string,
  userId: string,
  teamId: string,
  taskId: string,
  assignedToUserId?: string,
  assignedByUserId?: string
) {
  const supabase = createClient();

  const { data, error } = await (supabase as any).rpc(
    "assign_team_task_to_progress",
    {
      p_progress_id: progressId,
      p_user_id: userId,
      p_team_id: teamId,
      p_task_id: taskId,
      p_assigned_to_user_id: assignedToUserId,
      p_assigned_by_user_id: assignedByUserId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get team tasks with lazy progress and recurring metadata
 * Shows ALL active team tasks - only creates progress when needed
 */
export async function getTeamTasksVisible(teamId: string, userId?: string) {
  const supabase = createClient();

  let currentUserId = userId;
  if (!currentUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id;
  }

  try {
    const { data: allTasks, error } = await (supabase as any).rpc(
      "get_team_tasks_visible",
      {
        p_team_id: teamId,
        p_user_id: currentUserId,
      } as { p_team_id: string; p_user_id?: string }
    );

    if (error) {
      throw error;
    }

    const tasks = allTasks || [];

    // Enhance tasks with recurring metadata
    const enhancedTasks = tasks.map((task: any) => {
      const isRecurring =
        task.is_recurring === true ||
        task.template_code?.startsWith("TEAM-") ||
        task.task_title?.toLowerCase().includes("weekly") ||
        task.task_title?.toLowerCase().includes("meeting");

      return {
        ...task,
        is_recurring: isRecurring,
        template_code: task.template_code || null,
      };
    });

    return enhancedTasks;
  } catch (error) {
    throw error;
  }
}

/**
 * Get user tasks using visible architecture
 * Shows ALL active individual tasks with lazy progress
 */
export async function getUserTasksVisible(userId: string) {
  const supabase = createClient();

  const { data, error } = await (supabase as any).rpc(
    "get_user_tasks_visible",
    {
      p_user_id: userId,
    }
  );

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Helper function to create progress entry if needed (lazy creation)
 * Returns the progress_id (existing or newly created)
 */
export async function createProgressIfNeededDB(
  taskId: string,
  teamId?: string,
  userId?: string,
  context: "team" | "individual" = "team"
): Promise<string | null> {
  const supabase = createClient();

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
    throw error;
  }

  return data;
}

// ============================================================================
// TASK CRUD OPERATIONS (Admin)
// ============================================================================

export interface PeerReviewCriteria {
  category: string;
  points: string[];
}

export interface ResourceItem {
  title: string;
  description: string;
  type: "documentation" | "video" | "article" | "tool" | "example";
  url?: string;
}

export interface TipContent {
  title: string;
  content: string;
}

export interface CreateTaskParams {
  templateCode: string;
  taskContext?: "team" | "individual";
  title: string;
  description?: string;
  detailedInstructions?: string;
  category?: string;
  priority?: "low" | "medium" | "high" | "critical";
  difficultyLevel?: number;
  estimatedHours?: number;
  baseXpReward?: number;
  basePointsReward?: number;
  requiresReview?: boolean;
  achievementId?: string;
  tipsContent?: TipContent[];
  peerReviewCriteria?: PeerReviewCriteria[];
  learningObjectives?: string[];
  deliverables?: string[];
  resources?: ResourceItem[];
  reviewInstructions?: string;
  tags?: string[];
  sortOrder?: number;
  prerequisiteTemplateCodes?: string[];
  minimumTeamLevel?: number;
  isRecurring?: boolean;
  cooldownDays?: number;
  isConfidential?: boolean;
}

/**
 * Create a new task template (admin only)
 */
export async function createTask(params: CreateTaskParams) {
  const supabase = createClient();

  const taskInsert = {
    template_code: params.templateCode,
    activity_type: params.taskContext || "team",
    title: params.title,
    description: params.description || null,
    detailed_instructions: params.detailedInstructions || null,
    category: params.category || "development",
    priority: params.priority || "medium",
    difficulty_level: params.difficultyLevel || 1,
    estimated_hours: params.estimatedHours || 0,
    base_xp_reward: params.baseXpReward || 0,
    base_points_reward: params.basePointsReward || 0,
    requires_review: params.requiresReview || false,
    tips_content: (params.tipsContent || []) as unknown as Json,
    peer_review_criteria: (params.peerReviewCriteria || []) as unknown as Json,
    learning_objectives: params.learningObjectives || null,
    deliverables: params.deliverables || null,
    resources: (params.resources || []) as unknown as Json,
    review_instructions: params.reviewInstructions || null,
    tags: params.tags || null,
    sort_order: params.sortOrder || 0,
    prerequisite_template_codes: params.prerequisiteTemplateCodes || null,
    minimum_team_level: params.minimumTeamLevel || 1,
    achievement_id: params.achievementId || null,
    is_active: true,
    is_recurring: params.isRecurring || false,
    cooldown_days: params.cooldownDays || 7,
    is_confidential: params.isConfidential || false,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(taskInsert as any)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update a task template (admin only)
 */
export async function updateTask(
  taskId: string,
  params: Partial<CreateTaskParams>
) {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {};

  if (params.templateCode !== undefined)
    updateData.template_code = params.templateCode;
  if (params.title !== undefined) updateData.title = params.title;
  if (params.description !== undefined)
    updateData.description = params.description;
  if (params.detailedInstructions !== undefined)
    updateData.detailed_instructions = params.detailedInstructions;
  if (params.category !== undefined) updateData.category = params.category;
  if (params.priority !== undefined) updateData.priority = params.priority;
  if (params.difficultyLevel !== undefined)
    updateData.difficulty_level = params.difficultyLevel;
  if (params.estimatedHours !== undefined)
    updateData.estimated_hours = params.estimatedHours;
  if (params.baseXpReward !== undefined)
    updateData.base_xp_reward = params.baseXpReward;
  if (params.basePointsReward !== undefined)
    updateData.base_points_reward = params.basePointsReward;
  if (params.requiresReview !== undefined)
    updateData.requires_review = params.requiresReview;
  if (params.tipsContent !== undefined)
    updateData.tips_content = params.tipsContent;
  if (params.peerReviewCriteria !== undefined)
    updateData.peer_review_criteria = params.peerReviewCriteria;
  if (params.learningObjectives !== undefined)
    updateData.learning_objectives = params.learningObjectives;
  if (params.deliverables !== undefined)
    updateData.deliverables = params.deliverables;
  if (params.resources !== undefined) updateData.resources = params.resources;
  if (params.reviewInstructions !== undefined)
    updateData.review_instructions = params.reviewInstructions;
  if (params.tags !== undefined) updateData.tags = params.tags;
  if (params.sortOrder !== undefined) updateData.sort_order = params.sortOrder;
  if (params.prerequisiteTemplateCodes !== undefined)
    updateData.prerequisite_template_codes = params.prerequisiteTemplateCodes;
  if (params.minimumTeamLevel !== undefined)
    updateData.minimum_team_level = params.minimumTeamLevel;
  if (params.achievementId !== undefined)
    updateData.achievement_id = params.achievementId;
  if (params.taskContext !== undefined)
    updateData.activity_type = params.taskContext;

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", taskId)
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete a task template (admin only)
 */
export async function deleteTask(taskId: string) {
  const supabase = createClient();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    throw error;
  }

  return true;
}

/**
 * Get full task details for editing (admin)
 */
export async function getTaskForEdit(taskId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      id,
      title,
      description,
      detailed_instructions,
      category,
      priority,
      difficulty_level,
      estimated_hours,
      base_xp_reward,
      base_points_reward,
      tips_content,
      peer_review_criteria,
      learning_objectives,
      deliverables,
      resources,
      review_instructions,
      tags,
      created_at,
      updated_at
    `
    )
    .eq("id", taskId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
