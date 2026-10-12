/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Pure shaping of the team page's RPC rows. Moved out of the page on
 * 2026-10-12 unchanged in behaviour so the page could be split into
 * components; nothing here talks to the database.
 */
import type { TaskTableItem } from "@/types/team-journey";

export type TaskFilterStatus =
  | "all"
  | "not_started"
  | "in_progress"
  | "completed";

export interface TeamDetailTask {
  progress_id: string | null;
  task_id: string;
  is_confidential: boolean;
  title: string;
  description: string;
  category: string;
  difficulty_level: number;
  base_xp_reward: number;
  base_credits_reward: number;
  status: string;
  recurring_status: string | null;
  assigned_to_user_id: string | null;
  assignee_name: string | null;
  assignee_avatar_url: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  is_available: boolean;
  achievement_id: string | null;
  achievement_name: string | null;
  is_recurring: boolean;
  cooldown_days: number | null;
  template_code: string | null;
  next_available_at: string | null;
  has_active_instance: boolean;
  detailed_instructions: string | null;
  learning_objectives: string[] | null;
  deliverables: string[] | null;
  resources: unknown[] | null;
}

/** Rows of `get_team_achievement_dashboard` → the page's task shape. */
export function transformDashboardTasks(raw: unknown): TeamDetailTask[] {
  const rows: any[] = Array.isArray(raw) ? raw : [];
  return rows.map((task) => {
    const isRecurring = task.achievement_name === "Recurring Tasks";
    let finalStatus: string = task.progress_status || "not_started";
    let recurringStatus: string | null = null;

    if (isRecurring) {
      recurringStatus = task.recurring_status || "available";
      finalStatus =
        task.progress_status === "approved" && task.is_available === false
          ? "cooldown"
          : task.progress_status || "not_started";
    }

    return {
      progress_id: task.progress_id ?? null,
      task_id: task.task_id,
      is_confidential: task.is_confidential || false,
      title: task.task_title,
      description:
        task.task_description ||
        (isRecurring ? "Weekly recurring task" : "Team task"),
      category: task.category || (isRecurring ? "recurring" : "general"),
      difficulty_level: task.difficulty_level || (isRecurring ? 1 : 2),
      base_xp_reward: task.base_xp_reward || (isRecurring ? 200 : 100),
      base_credits_reward: task.base_points_reward || (isRecurring ? 20 : 10),
      status: finalStatus,
      recurring_status: recurringStatus,
      assigned_to_user_id: task.assigned_to_user_id ?? null,
      assignee_name: task.assignee_name ?? null,
      assignee_avatar_url: task.assignee_avatar_url ?? null,
      assigned_at: task.assigned_at ?? null,
      started_at: task.started_at ?? null,
      completed_at: task.completed_at ?? null,
      is_available: task.is_available === true,
      achievement_id: task.achievement_id ?? null,
      achievement_name: task.achievement_name ?? null,
      is_recurring: isRecurring,
      cooldown_days: task.cooldown_days ?? null,
      template_code: task.template_code ?? null,
      next_available_at: task.next_available_at ?? null,
      has_active_instance: task.has_active_instance || false,
      detailed_instructions: task.detailed_instructions || null,
      learning_objectives: task.learning_objectives || null,
      deliverables: task.deliverables || null,
      resources: task.resources || null,
    };
  });
}

/** "Idea Validation" first, "Recurring Tasks" last, sort_order between. */
export function sortTeamAchievements<
  T extends { achievement_name: string; sort_order?: number | null },
>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.achievement_name === "Idea Validation") return -1;
    if (b.achievement_name === "Idea Validation") return 1;
    if (a.achievement_name === "Recurring Tasks") return 1;
    if (b.achievement_name === "Recurring Tasks") return -1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
}

export interface TeamStrike {
  id: string;
  title: string;
  datetime: string;
  description?: string;
  status: "explained" | "waiting-explanation" | "rejected" | "resolved";
  action: "done" | "explain" | "rejected";
  userName?: string;
  rejectionReason?: string;
}

export function transformStrikes(raw: unknown): TeamStrike[] {
  const rows: any[] = Array.isArray(raw) ? raw : [];
  return rows.map((strike) => ({
    id: strike.id,
    title: strike.reason || strike.title || "Strike",
    datetime:
      strike.strike_date || strike.created_at
        ? new Date(strike.strike_date || strike.created_at).toLocaleDateString()
        : "N/A",
    description: strike.description,
    status:
      strike.status === "rejected"
        ? "rejected"
        : strike.status === "resolved"
          ? "resolved"
          : strike.explanation
            ? "explained"
            : "waiting-explanation",
    action:
      strike.status === "rejected"
        ? "rejected"
        : strike.explanation
          ? "done"
          : "explain",
    userName: strike.user_name || strike.users?.name || undefined,
    rejectionReason: strike.rejection_reason || undefined,
  }));
}

export interface TeamWeeklyReportRow {
  id: string;
  week: string;
  dateRange: string;
  weeklyFill: { avatars: string[]; names: string[] };
  clients: number;
  meetings: number;
  status: "complete" | "missed";
  submissions: any[];
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
  });

/** One row per ISO week, newest first, with every member's submission. */
export function groupWeeklyReports(raw: unknown): TeamWeeklyReportRow[] {
  const rows: any[] = Array.isArray(raw) ? raw : [];
  const byWeek = new Map<string, any>();
  for (const report of rows) {
    const key = `${report.week_year}-${report.week_number}`;
    if (!byWeek.has(key)) {
      byWeek.set(key, {
        week_number: report.week_number,
        week_year: report.week_year,
        week_start_date: report.week_start_date,
        week_end_date: report.week_end_date,
        submissions: [],
      });
    }
    byWeek.get(key).submissions.push(report);
  }
  const sum = (subs: any[], field: string) =>
    subs.reduce((n, s) => n + (Number(s.submission_data?.[field]) || 0), 0);

  return Array.from(byWeek.values())
    .sort((a, b) =>
      a.week_year !== b.week_year
        ? b.week_year - a.week_year
        : b.week_number - a.week_number
    )
    .map((w) => ({
      id: `${w.week_year}-${w.week_number}`,
      week: `Week ${w.week_number}`,
      dateRange: `${shortDate(w.week_start_date)} - ${shortDate(w.week_end_date)}`,
      weeklyFill: {
        avatars: w.submissions.map(
          (s: any) => s.users?.avatar_url || "/avatars/default.jpg"
        ),
        names: w.submissions.map((s: any) => s.users?.name || "Unknown"),
      },
      clients: sum(w.submissions, "clientsContacted"),
      meetings: sum(w.submissions, "meetingsHeld"),
      status: w.submissions.length > 0 ? "complete" : "missed",
      submissions: w.submissions,
    }));
}

export function taskFilterCategory(
  task: TeamDetailTask
): Exclude<TaskFilterStatus, "all"> {
  if (task.is_recurring) {
    if (task.status === "cooldown") return "in_progress";
    if (task.status === "approved" && task.is_available) return "not_started";
    if (["pending_review", "in_progress", "rejected"].includes(task.status))
      return "in_progress";
    return "not_started";
  }
  if (task.status === "approved") return "completed";
  if (["pending_review", "in_progress", "rejected"].includes(task.status))
    return "in_progress";
  return "not_started";
}

/** The shared TasksTable row for a team task (same mapping as before). */
export function toTaskTableItem(task: TeamDetailTask): TaskTableItem {
  let status: TaskTableItem["status"] = "Not Started";
  let action: TaskTableItem["action"] = "complete";

  if (task.is_recurring) {
    if (task.status === "cooldown") {
      status = "Cooldown";
      action = "done";
    } else if (task.status === "approved" && task.is_available) {
      status = "Not Started";
    } else if (task.status === "pending_review") {
      status = "Peer Review";
      action = "done";
    } else if (task.status === "in_progress") {
      status = "In Progress";
    } else if (task.status === "rejected") {
      status = "Not Accepted";
    }
  } else {
    status =
      task.status === "approved"
        ? "Finished"
        : task.status === "pending_review"
          ? "Peer Review"
          : task.status === "in_progress"
            ? "In Progress"
            : task.status === "rejected"
              ? "Not Accepted"
              : "Not Started";
    action = task.status === "approved" ? "done" : "complete";
  }

  return {
    id: task.progress_id || task.task_id,
    title: task.title,
    description: task.description,
    difficulty:
      task.difficulty_level === 1
        ? "Easy"
        : task.difficulty_level === 2
          ? "Medium"
          : "Hard",
    xp: task.base_xp_reward,
    points: task.base_credits_reward,
    status,
    responsible: task.assignee_name
      ? {
          name: task.assignee_name,
          avatar: task.assignee_avatar_url || "/avatars/john-doe.jpg",
          date: task.assigned_at || new Date().toISOString(),
        }
      : undefined,
    action,
    isAvailable: task.is_available,
    is_confidential: task.is_confidential,
    assignedAt: task.assigned_at,
    completedAt: task.completed_at,
    isRecurring: task.is_recurring,
    cooldownHours: task.is_recurring
      ? (task.cooldown_days || 7) * 24
      : undefined,
    nextAvailableAt: task.is_recurring ? task.next_available_at : null,
    recurringStatus: task.is_recurring
      ? task.recurring_status || "available"
      : undefined,
    hasActiveInstance: task.is_recurring ? task.has_active_instance : undefined,
    detailed_instructions: task.detailed_instructions,
    learning_objectives: task.learning_objectives,
    deliverables: task.deliverables,
    resources: task.resources,
  } as TaskTableItem;
}
