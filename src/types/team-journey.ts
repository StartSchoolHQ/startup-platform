export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  status: "Active" | "Inactive";
  customers: {
    count: number;
    label: string;
  };
  revenue: {
    amount: number;
    label: string;
  };
  points: {
    amount: number;
    label: string;
  };
  avatar: string;
  teamMembers: User[];
  category?: string;
}

export interface TeamJourneyData {
  allProducts: Product[];
  myProducts: Product[];
  archive: Product[];
}

// Task-related types for the simplified architecture
export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "rejected"
  | "revision_required"
  | "cancelled";
export type TaskPriority = "low" | "medium" | "high";
export type TaskCategory =
  | "onboarding"
  | "development"
  | "design"
  | "marketing"
  | "business"
  | "testing"
  | "deployment"
  | "milestone";

// Simplified Task interface - combines master task with team progress
export interface TeamTask {
  // Progress record data
  progress_id: string; // ID from team_task_progress table
  task_id: string; // ID from tasks (master) table

  // Master task data (from tasks table)
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  difficulty_level: number;
  base_xp_reward: number;
  detailed_instructions?: string;
  tips_content?: Array<{
    title: string;
    content: string;
  }>;
  peer_review_criteria?: Array<{
    category: string;
    points: string[];
  }>;
  learning_objectives?: string[];
  deliverables?: string[];
  resources?: Array<{
    title: string;
    type: string;
    url: string;
    description: string;
  }>;

  // Team progress data (from team_task_progress table)
  status: TaskStatus;
  assigned_to_user_id?: string;
  assignee_name?: string;
  assignee_avatar_url?: string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  is_available?: boolean;

  // For backwards compatibility and convenience
  id: string; // Maps to progress_id for existing code
  xp_reward: number; // Maps to base_xp_reward
  team_id?: string;
  teams?: {
    id: string;
    name: string;
  };
}

export interface TaskTableItem {
  id: string;
  title: string;
  description: string;
  responsible?: {
    name: string;
    avatar: string;
    date: string;
  };
  difficulty: "Easy" | "Medium" | "Hard";
  xp: number;
  points: number;
  status:
    | "Finished"
    | "In Progress"
    | "Not Accepted"
    | "Peer Review"
    | "Not Started";
  action: "complete" | "done";
  hasTips?: boolean;
  isAvailable?: boolean;
}
