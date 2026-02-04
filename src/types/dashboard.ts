import { LucideIcon } from "lucide-react";

export interface StatsCard {
  id?: string;
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
  id: string;
  name: string;
  totalXP: number;
  totalPoints: number;
  memberCount: number;
  completedTasks: number;
}

export interface TeamProgressData {
  title: string;
  joinTeamsText: string;
  hasTeams: boolean;
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
  progress_id: string | null;
  task_id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty_level: number | null;
  base_xp_reward: number | null;
  base_credits_reward: number | null;
  status: string | null;
  assigned_to_user_id?: string | null;
  assignee_name?: string | null;
  assignee_avatar_url?: string | null;
  assigned_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  is_available: boolean | null;
  achievement_id?: string | null;
  achievement_name?: string | null;
  is_confidential?: boolean | null;
  // Recurring task properties
  is_recurring?: boolean;
  recurring_status?: string | null;
  cooldown_days?: number;
  next_available_at?: string | null;
  has_active_instance?: boolean;
  template_code?: string | null;
  _debug?: {
    recurring_status?: string;
    has_active_instance?: boolean;
    latest_progress_id?: string | null;
  } | null;
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
