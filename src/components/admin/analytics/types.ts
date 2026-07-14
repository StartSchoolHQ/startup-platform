// Payload shapes returned by /api/admin/analytics/* (mirroring the
// get_analytics_* RPCs). Numerics from Postgres may arrive as strings —
// normalize with Number() at the consumer.

export interface OverviewWeek {
  week_start: string;
  reports: number;
  avg_score: number | string | null;
  min_score: number | null;
  max_score: number | null;
  low_scores: number;
  high_scores: number;
  real_blockers: number;
  commitments_total: number;
  commitments_completed: number;
  expected_reporters: number;
  active_teams: number;
}

export interface TeamWeekRow {
  team_id: string;
  team_name: string;
  team_status: string;
  week_start: string;
  avg_score: number | string | null;
  reports: number;
}

export interface TeamDetailRow {
  report_id: string;
  user_id: string;
  user_name: string | null;
  week_start: string;
  score: number | null;
  alignment_reason: string | null;
  blockers: string | null;
  key_insight: string | null;
  team_recognition: string | null;
  submitted_at: string | null;
}

export interface StudentRow {
  user_id: string;
  user_name: string | null;
  team_name: string | null;
  latest_score: number | null;
  latest_week: string | null;
  avg_score: number | string | null;
  recent_avg: number | string | null;
  prior_avg: number | string | null;
  weeks_submitted: number;
  last_submitted: string | null;
  scores: { week: string; score: number | null }[] | null;
}

export interface StudentDetailRow {
  report_id: string;
  week_start: string;
  score: number | null;
  alignment_reason: string | null;
  blockers: string | null;
  biggest_achievement: string | null;
  key_insight: string | null;
  help_needed: string | null;
  commitments_total: number;
  commitments_completed: number;
  submitted_at: string | null;
}

export interface WeekDetailRow {
  report_id: string;
  user_id: string;
  user_name: string | null;
  team_id: string | null;
  team_name: string | null;
  score: number | null;
  alignment_reason: string | null;
  blockers: string | null;
  submitted_at: string | null;
}

export interface MeetingsAnalytics {
  weekly: {
    week_start: string;
    meetings: number;
    willingness_to_pay: number;
    not_interested: number;
  }[];
  interest_funnel: { level: string; count: number }[];
  by_team: {
    team_id: string;
    team_name: string;
    team_status: string;
    meetings: number;
    willingness_to_pay: number;
    last_meeting: string | null;
  }[];
  learnings: {
    meeting_date: string;
    team_name: string;
    client_name: string | null;
    interest_level: string | null;
    main_learnings: string | null;
    client_feedback: string | null;
  }[];
}

export interface RetentionAnalytics {
  total_reporters: number;
  cohort: { week_start: string; reporters: number; pct_of_all: number }[];
  departures: { week_start: string; members_left: number }[];
  teams_archived: { week_start: string; teams: number }[];
  leavers: {
    user_id: string;
    user_name: string | null;
    team_name: string | null;
    left_at: string;
    weeks_reported: number;
    last_scores: (number | null)[];
  }[];
}

export interface StrikesAnalytics {
  weekly: {
    week_start: string;
    strikes: number;
    resolved: number;
    explained: number;
  }[];
  by_team: { team_name: string; strikes: number; resolved: number }[];
  recent_explanations: {
    created_at: string;
    team_name: string;
    status: string;
    explanation: string;
  }[];
}

export interface TaskFrictionAnalytics {
  least_completed: {
    title: string;
    assigned: number;
    approved: number;
    approval_rate: number;
  }[];
  slowest: { title: string; avg_days: number; completions: number }[];
  most_rejected: {
    title: string;
    rejections: number;
    resubmissions: number;
  }[];
  stale_in_progress: { count: number; oldest_started: string | null };
}

export interface EconomyAnalytics {
  weekly: {
    week_start: string;
    xp_earned: number;
    points_earned: number;
    points_lost: number;
  }[];
  by_type: { type: string; count: number; xp: number; points: number }[];
  penalties: {
    penalty_count: number;
    refund_count: number;
    users_penalized: number;
    points_lost_to_penalties: number;
  };
}

export interface TasksAnalytics {
  top_tasks: { title: string; completions: number }[];
  status_funnel: { status: string; count: number }[];
  weekly_completions: { week_start: string; completions: number }[];
}

// Existing admin house palette (validated: indigo/emerald/amber/red pass
// CVD separation; slate is used only as a neutral, never for identity).
export const CHART_COLORS = {
  primary: "#6366f1",
  positive: "#10b981",
  warning: "#f59e0b",
  negative: "#ef4444",
  neutral: "#94a3b8",
} as const;

// Fixed categorical order for multi-series (per-member) lines.
export const SERIES_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#0ea5e9",
  "#8b5cf6",
  "#f97316",
  "#14b8a6",
] as const;

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return CHART_COLORS.neutral;
  if (score <= 4) return CHART_COLORS.negative;
  if (score <= 6) return CHART_COLORS.warning;
  return CHART_COLORS.positive;
}

export function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function formatWeek(weekStart: string): string {
  const d = new Date(weekStart);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
