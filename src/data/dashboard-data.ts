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
import {
  getUserProfile,
  getUserAchievementProgress,
  getTasksByAchievement,
} from "@/lib/database";

// Function to get real stats cards data
export async function getStatsCards(userId: string): Promise<StatsCard[]> {
  try {
    const userProfile = await getUserProfile(userId);

    return [
      {
        title: "XP Earned",
        value: (userProfile.total_xp ?? 0).toString(),
        subtitle: "Total experience points",
        icon: Trophy,
        iconColor: "text-purple-500",
      },
      {
        title: "Points Earned",
        value: (userProfile.individual_points ?? 0).toString(),
        subtitle: "Available startup capital",
        icon: Star,
        iconColor: "text-orange-500",
      },
      {
        title: "Achievements",
        value: "0/25", // Keep original mock format - will update later
        subtitle: "Achievements unlocked",
        icon: Target,
        iconColor: "text-yellow-500",
      },
      {
        title: "Tasks",
        value: "0/150", // Keep original mock format - will update later
        subtitle: "Tasks completed",
        icon: Users,
        iconColor: "text-green-500",
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
    const userProfile = await getUserProfile(userId);

    return {
      title: "Your Teams Progress",
      joinTeamsText: "Join Teams",
      stats: [
        {
          value: (userProfile.individual_points ?? 0).toString(),
          label: "Total Points Earned", // Keep original label
          icon: Star,
          iconColor: "text-orange-500",
        },
        {
          value: (userProfile.total_xp ?? 0).toString(),
          label: "Total XP Earned",
          icon: Trophy,
          iconColor: "text-purple-500",
        },
      ],
      teams: [], // Keep empty for now - will populate with real team data later
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
    const userProfile = await getUserProfile(userId);

    return {
      title: "Your Personal Progress",
      stats: [
        {
          value: (userProfile.individual_points ?? 0).toString(),
          label: "Total Points Earned", // Keep original label
          icon: Star,
          iconColor: "text-orange-500",
        },
        {
          value: (userProfile.total_xp ?? 0).toString(),
          label: "Total XP Earned",
          icon: Trophy,
          iconColor: "text-purple-500",
        },
      ],
      activities: [
        {
          name: "Strikes", // Keep original
          icon: AlertTriangle, // Use correct original icon
          iconColor: "text-red-500",
          indicators: "••", // Keep original indicators
        },
        {
          name: "30 Tests", // Keep original
          label: "How Much Tests Done", // Keep original label
          icon: FileText,
          iconColor: "text-pink-500",
        },
      ],
      actions: [
        {
          text: "Submit Weekly Report", // Keep original
          icon: FileText,
          variant: "outline",
        },
        {
          text: "View Progress", // Keep original
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
      iconColor: "text-purple-500",
    },
    {
      title: "Points Earned",
      value: "500",
      subtitle: "Available startup capital",
      icon: Star,
      iconColor: "text-orange-500",
    },
    {
      title: "Achievements",
      value: "0/25",
      subtitle: "Achievements unlocked",
      icon: Target,
      iconColor: "text-yellow-500",
    },
    {
      title: "Tasks",
      value: "0/150",
      subtitle: "Tasks completed",
      icon: Users,
      iconColor: "text-green-500",
    },
  ];
}

function getDefaultTeamProgressData(): TeamProgressData {
  return {
    title: "Your Teams Progress",
    joinTeamsText: "Join Teams",
    stats: [
      {
        value: "500",
        label: "Total Points Earned",
        icon: Star,
        iconColor: "text-orange-500",
      },
      {
        value: "0",
        label: "Total XP Earned",
        icon: Trophy,
        iconColor: "text-purple-500",
      },
    ],
    teams: [],
  };
}

function getDefaultPersonalProgressData(): PersonalProgressData {
  return {
    title: "Your Personal Progress",
    stats: [
      {
        value: "500",
        label: "Total Points Earned",
        icon: Star,
        iconColor: "text-orange-500",
      },
      {
        value: "0",
        label: "Total XP Earned",
        icon: Trophy,
        iconColor: "text-purple-500",
      },
    ],
    activities: [
      {
        name: "Strikes",
        icon: AlertTriangle,
        iconColor: "text-red-500",
        indicators: "••",
      },
      {
        name: "30 Tests",
        label: "How Much Tests Done",
        icon: FileText,
        iconColor: "text-pink-500",
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

interface TaskRow {
  progress_id: string;
  task_id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: number;
  base_xp_reward: number;
  base_credits_reward: number;
  status: string;
  assigned_to_user_id?: string;
  assignee_name?: string;
  assignee_avatar_url?: string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  is_available: boolean;
  achievement_id?: string;
  achievement_name?: string;
}

// Function to get achievement progress data
export async function getAchievementProgressData(
  userId: string
): Promise<AchievementProgress> {
  try {
    const [achievements, tasks] = await Promise.all([
      getUserAchievementProgress(userId),
      getTasksByAchievement(), // Get all tasks by default
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
      tasks: (tasks as TaskRow[]).map((task) => ({
        progress_id: task.progress_id,
        task_id: task.task_id,
        title: task.title,
        description: task.description,
        category: task.category,
        difficulty_level: task.difficulty_level,
        base_xp_reward: task.base_xp_reward,
        base_credits_reward: task.base_credits_reward,
        status: task.status,
        assigned_to_user_id: task.assigned_to_user_id,
        assignee_name: task.assignee_name,
        assignee_avatar_url: task.assignee_avatar_url,
        assigned_at: task.assigned_at,
        started_at: task.started_at,
        completed_at: task.completed_at,
        is_available: task.is_available,
        achievement_id: task.achievement_id,
        achievement_name: task.achievement_name,
      })),
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

// Function to get filtered tasks by achievement
export async function getFilteredTasksByAchievement(
  achievementId: string | null
): Promise<TaskWithAchievement[]> {
  try {
    const tasks = await getTasksByAchievement(achievementId || undefined);

    return (tasks as TaskRow[]).map((task) => ({
      progress_id: task.progress_id,
      task_id: task.task_id,
      title: task.title,
      description: task.description,
      category: task.category,
      difficulty_level: task.difficulty_level,
      base_xp_reward: task.base_xp_reward,
      base_credits_reward: task.base_credits_reward,
      status: task.status,
      assigned_to_user_id: task.assigned_to_user_id,
      assignee_name: task.assignee_name,
      assignee_avatar_url: task.assignee_avatar_url,
      assigned_at: task.assigned_at,
      started_at: task.started_at,
      completed_at: task.completed_at,
      is_available: task.is_available,
      achievement_id: task.achievement_id,
      achievement_name: task.achievement_name,
    }));
  } catch (error) {
    console.error("Error fetching filtered tasks:", error);
    return [];
  }
}
