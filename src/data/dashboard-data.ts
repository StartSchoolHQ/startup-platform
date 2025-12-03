import {
  Trophy,
  Star,
  Target,
  Users,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  StatsCard,
  TeamProgressData,
  PersonalProgressData,
  TaskWithAchievement,
  AchievementProgress,
} from "@/types/dashboard";
import type { Database } from "@/types/database";
import {
  getUserProfile,
  getUserAchievementProgress,
  getUserTasksVisible,
  getUserTeams,
  getUserTaskCompletionStats,
  getPeerReviewStatsFromTransactions,
  getUserStrikes,
  getIndividualActivityStats,
  getTeamPointsEarned,
  getTeamXPEarned,
} from "@/lib/database";

// Function to get real stats cards data
export async function getStatsCards(userId: string): Promise<StatsCard[]> {
  try {
    const [userProfile, taskStats, achievementProgress] = await Promise.all([
      getUserProfile(userId),
      getUserTaskCompletionStats(userId),
      getUserAchievementProgress(userId),
    ]);

    // Calculate achievement stats
    const achievements = achievementProgress as Array<{
      is_completed: boolean;
      total_tasks: number;
    }>;

    const completedAchievements = achievements.filter(
      (ach) => ach.is_completed
    ).length;
    const totalAchievements = achievements.length;

    return [
      {
        title: "XP Balance",
        value: (userProfile.total_xp ?? 0).toString(),
        subtitle: "Total experience points",
        icon: Trophy,
        iconColor: "text-black dark:text-white",
      },
      {
        title: "Points Balance",
        value: (userProfile.total_points ?? 0).toString(),
        subtitle: "Available startup capital",
        icon: Star,
        iconColor: "text-black dark:text-white",
      },
      {
        title: "Achievements",
        value: `${completedAchievements}/${totalAchievements}`,
        subtitle: "Achievements unlocked",
        icon: Target,
        iconColor: "text-black dark:text-white",
      },
      {
        title: "Tasks",
        value: `${taskStats.completed}/${taskStats.total}`,
        subtitle: "Tasks completed",
        icon: Users,
        iconColor: "text-black dark:text-white",
      },
    ];
  } catch (error) {
    console.error("Error fetching stats cards:", error);
    return getDefaultStatsCards();
  }
}

// Function to get real team progress data
export async function getTeamProgressData(
  userId: string
): Promise<TeamProgressData> {
  try {
    const [userTeams] = await Promise.all([getUserTeams(userId)]);

    const hasTeams = userTeams.length > 0;

    // Calculate aggregated stats across all teams
    let totalTeamXP = 0;
    let totalTeamPoints = 0;
    const teamsData = [];

    // Fetch detailed team member data for each team
    for (const membership of userTeams) {
      const team = membership.teams as unknown as {
        id: string;
        name: string;
        description: string | null;
        member_count: number | null;
        created_at: string;
        founder_id: string;
      } | null;

      if (!team) continue;

      // Get team member count and completed tasks
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", team.id)
        .is("left_at", null);

      // Count completed team tasks (status = 'approved')
      const { data: completedTasks, error: tasksError } = await supabase
        .from("task_progress")
        .select("id")
        .eq("team_id", team.id)
        .eq("status", "approved");

      if (tasksError) {
        console.error(
          "Error fetching completed tasks for team:",
          team.id,
          tasksError
        );
      }

      const completedTasksCount = completedTasks?.length || 0;
      const actualMemberCount = members?.length || 0;

      // Calculate team-scoped points and XP (only from team activities)
      const [teamPoints, teamXP] = await Promise.all([
        getTeamPointsEarned(team.id),
        getTeamXPEarned(team.id),
      ]);

      totalTeamXP += teamXP;
      totalTeamPoints += teamPoints;

      teamsData.push({
        id: team.id,
        name: team.name,
        totalXP: teamXP,
        totalPoints: teamPoints,
        memberCount: actualMemberCount,
        completedTasks: completedTasksCount || 0,
      });
    }

    return {
      title: "Your Teams Progress",
      joinTeamsText: "View Products",
      hasTeams,
      stats:
        hasTeams && teamsData.length > 1
          ? [
              {
                value: totalTeamPoints.toString(),
                label: "Total Team Points",
                icon: Star,
                iconColor: "text-black dark:text-white",
              },
              {
                value: totalTeamXP.toString(),
                label: "Total Team XP",
                icon: Trophy,
                iconColor: "text-black dark:text-white",
              },
            ]
          : [],
      teams: teamsData,
    };
  } catch (error) {
    console.error("Error fetching team progress:", error);
    return getDefaultTeamProgressData();
  }
}

// Function to get real personal progress data
export async function getPersonalProgressData(
  userId: string
): Promise<PersonalProgressData> {
  try {
    const [individualStats, peerReviewStats, userStrikes] = await Promise.all([
      getIndividualActivityStats(userId),
      getPeerReviewStatsFromTransactions(userId),
      getUserStrikes(userId),
    ]);

    return {
      title: "Your Personal Progress",
      stats: [
        {
          value: individualStats.totalPointsEarned.toString(),
          label: "Points from Individual Activities",
          icon: Star,
          iconColor: "text-black dark:text-white",
        },
        {
          value: individualStats.totalXpEarned.toString(),
          label: "XP from Individual Activities",
          icon: Trophy,
          iconColor: "text-black dark:text-white",
        },
      ],
      activities: [
        {
          name: `${userStrikes.length} Strikes`,
          icon: AlertTriangle,
          iconColor: "text-black dark:text-white",
          indicators: userStrikes.length > 0 ? "••" : "",
        },
        {
          name: `${peerReviewStats.tasksReviewedByUser} Reviews`,
          label: "Peer Reviews Completed",
          icon: FileText,
          iconColor: "text-black dark:text-white",
        },
      ],
      actions: [
        {
          text: "Submit Weekly Report",
          icon: FileText,
          variant: "outline",
        },
        {
          text: "View Progress",
          icon: FileText,
          variant: "default",
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching personal progress:", error);
    return getDefaultPersonalProgressData();
  }
}

// Fallback default data
function getDefaultStatsCards(): StatsCard[] {
  return [
    {
      title: "XP Earned",
      value: "0",
      subtitle: "Total experience points",
      icon: Trophy,
      iconColor: "text-black dark:text-white",
    },
    {
      title: "Points Earned",
      value: "500",
      subtitle: "Available startup capital",
      icon: Star,
      iconColor: "text-black dark:text-white",
    },
    {
      title: "Achievements",
      value: "0/25",
      subtitle: "Achievements unlocked",
      icon: Target,
      iconColor: "text-black dark:text-white",
    },
    {
      title: "Tasks",
      value: "0/150",
      subtitle: "Tasks completed",
      icon: Users,
      iconColor: "text-black dark:text-white",
    },
  ];
}

function getDefaultTeamProgressData(): TeamProgressData {
  return {
    title: "Your Teams Progress",
    joinTeamsText: "View Products",
    hasTeams: false,
    stats: [],
    teams: [],
  };
}

function getDefaultPersonalProgressData(): PersonalProgressData {
  return {
    title: "Your Personal Progress",
    stats: [
      {
        value: "0",
        label: "Points from Individual Activities",
        icon: Star,
        iconColor: "text-black dark:text-white",
      },
      {
        value: "0",
        label: "XP from Individual Activities",
        icon: Trophy,
        iconColor: "text-black dark:text-white",
      },
    ],
    activities: [
      {
        name: "0 Strikes",
        icon: AlertTriangle,
        iconColor: "text-black dark:text-white",
        indicators: "",
      },
      {
        name: "0 Reviews",
        label: "Peer Reviews Completed",
        icon: FileText,
        iconColor: "text-black dark:text-white",
      },
    ],
    actions: [
      {
        text: "Submit Weekly Report",
        icon: FileText,
        variant: "outline",
      },
      {
        text: "View Progress",
        icon: FileText,
        variant: "default",
      },
    ],
  };
}

// Database result interfaces
interface AchievementProgressRow {
  achievement_id: string;
  achievement_name: string;
  achievement_description: string;
  achievement_icon: string;
  xp_reward: number;
  credits_reward: number;
  color_theme: string;
  sort_order: number;
  total_tasks: bigint;
  completed_tasks: bigint;
  status: string;
  is_completed: boolean;
}

// Function to get achievement progress data
export async function getAchievementProgressData(
  userId: string
): Promise<AchievementProgress> {
  try {
    const [achievements, tasks] = await Promise.all([
      getUserAchievementProgress(userId),
      getUserTasksVisible(userId), // Get user's visible tasks with lazy progress
    ]);

    return {
      achievements: (achievements as AchievementProgressRow[]).map(
        (achievement) => ({
          achievement_id: achievement.achievement_id,
          achievement_name: achievement.achievement_name,
          achievement_description: achievement.achievement_description,
          achievement_icon: achievement.achievement_icon,
          xp_reward: achievement.xp_reward,
          credits_reward: achievement.credits_reward,
          color_theme: achievement.color_theme,
          sort_order: achievement.sort_order,
          total_tasks: Number(achievement.total_tasks),
          completed_tasks: Number(achievement.completed_tasks),
          status: achievement.status as
            | "completed"
            | "in-progress"
            | "not-started",
          is_completed: achievement.is_completed,
        })
      ),
      tasks: (
        tasks as Database["public"]["Functions"]["get_user_tasks_visible"]["Returns"]
      ).map((task) => {
        const taskData = task;
        return {
          progress_id: taskData.progress_id,
          task_id: taskData.task_id,
          title: taskData.task_title,
          description: taskData.task_description,
          category: taskData.category,
          difficulty_level: taskData.difficulty_level,
          base_xp_reward: taskData.base_xp_reward,
          base_credits_reward: taskData.base_points_reward,
          status: taskData.progress_status,
          assigned_to_user_id: taskData.assigned_to_user_id,
          assignee_name: taskData.assignee_name,
          assignee_avatar_url: taskData.assignee_avatar_url,
          assigned_at: taskData.assigned_at,
          started_at: taskData.started_at,
          completed_at: taskData.completed_at,
          is_available: taskData.is_available,
          achievement_id: taskData.achievement_id,
          achievement_name: taskData.achievement_name,
        };
      }),
      selectedAchievementId: null,
    };
  } catch (error) {
    console.error("Error fetching achievement progress:", error);
    return {
      achievements: [],
      tasks: [],
      selectedAchievementId: null,
    };
  }
}

// Function to get filtered tasks by achievement using lazy progress architecture
export async function getFilteredTasksByAchievement(
  achievementId: string | null,
  userId: string
): Promise<TaskWithAchievement[]> {
  try {
    const tasks = await getUserTasksVisible(userId);

    // Filter by achievement if specified
    const filteredTasks = achievementId
      ? (
          tasks as Database["public"]["Functions"]["get_user_tasks_visible"]["Returns"]
        ).filter((task) => task.achievement_id === achievementId)
      : tasks;

    return (
      filteredTasks as Database["public"]["Functions"]["get_user_tasks_visible"]["Returns"]
    ).map((task) => {
      const taskData = task;
      return {
        progress_id: taskData.progress_id,
        task_id: taskData.task_id,
        title: taskData.task_title,
        description: taskData.task_description,
        category: taskData.category,
        difficulty_level: taskData.difficulty_level,
        base_xp_reward: taskData.base_xp_reward,
        base_credits_reward: taskData.base_points_reward,
        status: taskData.progress_status,
        assigned_to_user_id: taskData.assigned_to_user_id,
        assignee_name: taskData.assignee_name,
        assignee_avatar_url: taskData.assignee_avatar_url,
        assigned_at: taskData.assigned_at,
        started_at: taskData.started_at,
        completed_at: taskData.completed_at,
        is_available: taskData.is_available,
        achievement_id: taskData.achievement_id,
        achievement_name: taskData.achievement_name,
      };
    });
  } catch (error) {
    console.error("Error fetching filtered tasks:", error);
    return [];
  }
}
