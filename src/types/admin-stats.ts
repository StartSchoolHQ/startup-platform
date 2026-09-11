import type { AiReviewAdminSummary } from "@/types/ai-review-admin";

/** Row shape of `get_admin_program_health_v3()`. */
export interface ProgramHealth {
  total_students: number;
  active_7d: number;
  active_14d: number;
  at_risk_students: number;
  reports_this_week: number;
  reports_last_week: number;
  tasks_this_week: number;
  tasks_last_week: number;
  pending_strikes: number;
  pending_reviews: number;
  avg_xp_per_student: number;
  total_active_teams: number;
  students_active: number;
  students_slowing: number;
  students_at_risk: number;
  teams_active: number;
  teams_slowing: number;
  teams_at_risk: number;
  students_active_wow_delta: number;
  students_at_risk_wow_delta: number;
  teams_active_wow_delta: number;
  teams_at_risk_wow_delta: number;
}

/** Row shape of `get_admin_task_pipeline_v1()`. */
export interface TaskPipelineRow {
  activity_type: "individual" | "team";
  status: string;
  count: number;
}

export interface TeamRanking {
  id: string;
  name: string;
  team_points: number;
  total_xp?: number;
}

export interface WeeklyTrend {
  week_number: number;
  week_year: number;
  week_label: string;
  report_submissions: number;
  tasks_completed: number;
  active_students: number;
}

/** Body of `GET /api/admin/stats` — exactly what the overview renders. */
export interface AdminStats {
  programHealth: ProgramHealth | null;
  taskPipeline: TaskPipelineRow[];
  aiReview: AiReviewAdminSummary | null;
  teamXp: TeamRanking[];
  weeklyTrends: WeeklyTrend[];
}
