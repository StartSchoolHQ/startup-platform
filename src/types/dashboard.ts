import { LucideIcon } from "lucide-react";

export interface StatsCard {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
}

export interface TeamStat {
  value: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
}

export interface Team {
  name: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
}

export interface TeamProgressData {
  title: string;
  joinTeamsText: string;
  stats: TeamStat[];
  teams: Team[];
}

export interface PersonalStat {
  value: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
}

export interface Activity {
  name: string;
  icon: LucideIcon;
  iconColor: string;
  indicators?: string;
  label?: string;
}

export interface Action {
  text: string;
  icon: LucideIcon;
  variant?: "default" | "outline";
}

export interface PersonalProgressData {
  title: string;
  stats: PersonalStat[];
  activities: Activity[];
  actions: Action[];
}

// Achievement System Types
export interface Achievement {
  achievement_id: string;
  achievement_name: string;
  achievement_description: string;
  achievement_icon: string;
  xp_reward: number;
  credits_reward: number;
  color_theme: string;
  sort_order: number;
  total_tasks: number;
  completed_tasks: number;
  status: "completed" | "in-progress" | "not-started";
  is_completed: boolean;
}

export interface TaskWithAchievement {
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

export interface AchievementProgress {
  achievements: Achievement[];
  tasks: TaskWithAchievement[];
  selectedAchievementId?: string | null;
}

export interface AchievementCardProps {
  achievement: Achievement;
  isSelected: boolean;
  onClick: (achievementId: string | null) => void;
}
