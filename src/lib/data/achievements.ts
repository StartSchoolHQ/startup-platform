/**
 * Achievement System Functions
 *
 * Handles:
 * - User achievement progress tracking
 * - Achievement unlocking and awards
 * - Tasks grouped by achievement
 * - Team achievement dashboard
 */

import { createClient } from "../supabase/client";

interface SupabaseRpcClient {
  rpc(
    fn: "get_user_achievement_progress",
    params: { p_user_id: string }
  ): Promise<{ data: unknown; error: unknown }>;
  rpc(
    fn: "get_tasks_by_achievement",
    params: { p_achievement_id: string | null; p_team_id: string | null }
  ): Promise<{ data: unknown; error: unknown }>;
  rpc(
    fn: "check_and_award_achievement",
    params: { p_user_id: string; p_achievement_id: string }
  ): Promise<{ data: unknown; error: unknown }>;
  rpc(
    fn: "get_team_achievement_dashboard",
    params: { p_team_id: string; p_user_id: string }
  ): Promise<{ data: unknown; error: unknown }>;
}

/**
 * Get user's achievement progress
 */
export async function getUserAchievementProgress(userId: string) {
  const supabase = createClient();

  const { data, error } = await (supabase as unknown as SupabaseRpcClient).rpc(
    "get_user_achievement_progress",
    { p_user_id: userId }
  );

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get tasks grouped by achievement
 */
export async function getTasksByAchievement(
  achievementId?: string,
  teamId?: string
) {
  const supabase = createClient();

  const { data, error } = await (supabase as unknown as SupabaseRpcClient).rpc(
    "get_tasks_by_achievement",
    {
      p_achievement_id: achievementId || null,
      p_team_id: teamId || null,
    }
  );

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Check and award achievement to user
 */
export async function checkAndAwardAchievement(
  userId: string,
  achievementId: string
) {
  const supabase = createClient();

  const { data, error } = await (supabase as unknown as SupabaseRpcClient).rpc(
    "check_and_award_achievement",
    {
      p_user_id: userId,
      p_achievement_id: achievementId,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

/**
 * OPTIMIZED: Get team achievement dashboard in single RPC call
 * Combines: client meetings + achievements + tasks → 1 database call
 * Reduces 3 sequential queries to 1 (66% improvement)
 */
export async function getTeamAchievementDashboard(
  teamId: string,
  userId: string
): Promise<{
  clientMeetingsCount: number;
  achievementsUnlocked: boolean;
  clientMeetings: any[];
  achievements: any[];
  tasks: any[];
}> {
  const supabase = createClient();

  const { data, error } = await (supabase as unknown as SupabaseRpcClient).rpc(
    "get_team_achievement_dashboard",
    {
      p_team_id: teamId,
      p_user_id: userId,
    }
  );

  if (error) {
    throw error;
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return {
      clientMeetingsCount: 0,
      achievementsUnlocked: false,
      clientMeetings: [],
      achievements: [],
      tasks: [],
    };
  }

  const result = (data as any)?.[0] || {
    client_meetings_count: 0,
    achievements_unlocked: false,
    client_meetings: [],
    achievements: [],
    tasks: [],
  };

  // Fetch recurring task metadata separately
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recurringData, error: recurringError } = await (
    supabase as any
  ).rpc("get_recurring_task_status", {
    team_id_param: teamId,
    user_id_param: userId,
  });

  // Merge recurring task data with main tasks
  let tasks = result.tasks || [];
  if (!recurringError && recurringData) {
    // Create a map of recurring task data by task_id
    const recurringMap = new Map(recurringData.map((r: any) => [r.task_id, r]));

    // Merge recurring fields into tasks
    tasks = tasks.map((task: any) => {
      const recurring = recurringMap.get(task.task_id) as any;
      if (recurring) {
        return {
          ...task,
          template_code: recurring.template_code,
          is_recurring: recurring.is_recurring,
          cooldown_days: recurring.cooldown_days,
          last_completion: recurring.last_completion,
          next_available_at: recurring.next_available,
          latest_progress_id: recurring.latest_progress_id,
          recurring_status: recurring.recurring_status,
          has_active_instance: recurring.has_active_instance,
        };
      }
      return task;
    });
  }

  return {
    clientMeetingsCount: result.client_meetings_count || 0,
    achievementsUnlocked: result.achievements_unlocked || false,
    clientMeetings: result.client_meetings || [],
    achievements: result.achievements || [],
    tasks,
  };
}

/**
 * Get team achievements with progress tracking
 * Shows achievement status based on task completion
 */
export async function getTeamAchievements(teamId: string) {
  const supabase = createClient();

  // Get ONLY team achievements (context='team')
  const { data: achievements, error: achievementsError } = await supabase
    .from("achievements")
    .select(
      "id, name, description, icon, xp_reward, points_reward, sort_order, context"
    )
    .eq("context", "team") // Filter for team achievements only
    .order("sort_order", { ascending: true });

  if (achievementsError) {
    throw achievementsError;
  }

  // Get completed team achievements for this team
  const { data: completedTeamAchievements, error: teamAchError } =
    await supabase
      .from("team_achievements")
      .select("achievement_id")
      .eq("team_id", teamId);

  if (teamAchError) {
    throw teamAchError;
  }

  const completedTeamAchievementIds = new Set(
    completedTeamAchievements?.map((ta) => ta.achievement_id) || []
  );

  // Get task progress for this team (only team context tasks)
  const { data: taskProgress, error: progressError } = await supabase
    .from("task_progress")
    .select("task_id, status")
    .eq("team_id", teamId)
    .eq("context", "team"); // Only count team tasks for team achievements

  if (progressError) {
    throw progressError;
  }

  // Get tasks to link with achievements (only team context tasks matter here)
  const { data: allTasksWithAchievements, error: tasksAchError } =
    await supabase.from("tasks").select("id, achievement_id");

  if (tasksAchError) {
    throw tasksAchError;
  }

  // Create task_id -> achievement_id mapping
  const taskToAchievementMap = new Map<string, string>();
  allTasksWithAchievements?.forEach((task) => {
    if (task.achievement_id) {
      taskToAchievementMap.set(task.id, task.achievement_id);
    }
  });

  // Count tasks per achievement
  const progressMap = new Map<string, { total: number; completed: number }>();

  // Get all tasks for counting totals (all tasks, since achievements are hybrid)
  const { data: allTasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, achievement_id");

  if (tasksError) {
    throw tasksError;
  }

  // Count total tasks per achievement
  allTasks?.forEach((task) => {
    if (task.achievement_id) {
      const current = progressMap.get(task.achievement_id) || {
        total: 0,
        completed: 0,
      };
      progressMap.set(task.achievement_id, {
        ...current,
        total: current.total + 1,
      });
    }
  });

  // Count completed AND in-progress TEAM tasks from team progress
  const inProgressMap = new Map<string, number>();
  taskProgress?.forEach((progress) => {
    const achievementId = taskToAchievementMap.get(progress.task_id);
    if (achievementId) {
      // Count completed tasks
      if (progress.status === "approved") {
        const current = progressMap.get(achievementId) || {
          total: 0,
          completed: 0,
        };
        progressMap.set(achievementId, {
          ...current,
          completed: current.completed + 1,
        });
      }
      // Count in-progress tasks
      if (progress.status === "in_progress") {
        inProgressMap.set(
          achievementId,
          (inProgressMap.get(achievementId) || 0) + 1
        );
      }
    }
  });

  // Transform to Achievement interface format
  const transformedAchievements =
    achievements?.map((ach) => {
      const progress = progressMap.get(ach.id) || { total: 0, completed: 0 };
      const hasInProgressTasks = (inProgressMap.get(ach.id) || 0) > 0;
      const isInProgress =
        hasInProgressTasks ||
        (progress.completed > 0 && progress.completed < progress.total);

      // Display TOTAL rewards (not divided) and check actual completion status from team_achievements table
      return {
        achievement_id: ach.id,
        achievement_name: ach.name,
        achievement_description: ach.description || "",
        achievement_icon: ach.icon || "trophy",
        xp_reward: ach.xp_reward || 0, // TOTAL value (will be split when awarded)
        credits_reward: ach.points_reward || 0, // TOTAL value (will be split when awarded)
        color_theme: "blue",
        sort_order: ach.sort_order || 0,
        total_tasks: progress.total,
        completed_tasks: progress.completed,
        status: completedTeamAchievementIds.has(ach.id)
          ? ("completed" as const)
          : isInProgress
            ? ("in-progress" as const)
            : ("not-started" as const),
        is_completed: completedTeamAchievementIds.has(ach.id),
      };
    }) || [];

  return transformedAchievements;
}
