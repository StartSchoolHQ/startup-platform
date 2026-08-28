/**
 * Maps the two My Journey task RPC payloads onto the shared `TaskTableItem`
 * shape used by `TasksTable`.
 *
 * `get_user_tasks_visible` returns every active solo task (lazy progress),
 * `get_user_individual_tasks` returns the rows that already have progress —
 * so on a conflict the individual row wins, it carries the live progress.
 */

import { TaskTableItem } from "@/types/team-journey";

export interface MyJourneyTaskOwner {
  name: string | null;
  avatarUrl: string | null;
}

function toUIStatus(status: string | null): TaskTableItem["status"] {
  switch (status) {
    case "approved":
      return "Finished";
    case "in_progress":
      return "In Progress";
    case "rejected":
    case "revision_required":
      return "Not Accepted";
    case "pending_review":
      return "Peer Review";
    default:
      return "Not Started";
  }
}

function toDifficulty(level: number): TaskTableItem["difficulty"] {
  if (level >= 4) return "Hard";
  if (level >= 3) return "Medium";
  return "Easy";
}

function toTableItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task: any,
  fallbackAvailable: boolean,
  owner: MyJourneyTaskOwner
): TaskTableItem {
  const status = toUIStatus(task.progress_status ?? task.status ?? null);
  const started = status !== "Not Started";

  return {
    id: task.progress_id || `temp-${task.task_id}`,
    title: task.task_title || task.title,
    description: task.task_description || task.description,
    difficulty: toDifficulty(task.difficulty_level),
    xp: task.base_xp_reward,
    points: task.base_points_reward || 0,
    status,
    action: status === "Finished" ? "done" : "complete",
    isAvailable: task.is_available ?? fallbackAvailable,
    // Solo tasks have no assignee. The responsible slot only marks a task the
    // student already picked up, so the table offers "View Info" instead of
    // another "Start" — the column itself is hidden for this economy.
    responsible: started
      ? {
          name: owner.name ?? "You",
          avatar: owner.avatarUrl ?? "",
          date: task.assigned_at ?? task.started_at ?? "",
        }
      : undefined,
    reviewFeedback: task.reviewer_notes,
    assignedAt: task.assigned_at,
    completedAt: task.completed_at,
    task_id: task.task_id,
    achievement_id: task.achievement_id,
    detailed_instructions: task.detailed_instructions,
    learning_objectives: task.learning_objectives,
    deliverables: task.deliverables,
    resources: task.resources,
  };
}

export function buildMyJourneyTasks(
  availableTasks: unknown,
  individualTasks: unknown,
  owner: MyJourneyTaskOwner
): TaskTableItem[] {
  const taskMap = new Map<string, TaskTableItem>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (value: unknown): any[] => (Array.isArray(value) ? value : []);

  rows(availableTasks).forEach((task) => {
    taskMap.set(task.task_id, toTableItem(task, false, owner));
  });
  rows(individualTasks).forEach((task) => {
    taskMap.set(task.task_id, toTableItem(task, true, owner));
  });

  return Array.from(taskMap.values());
}
