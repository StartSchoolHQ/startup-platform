/**
 * Maps the two My Journey task RPC payloads onto the shared `TaskTableItem`
 * shape used by `TasksTable`.
 *
 * `get_user_tasks_visible` is the descriptive source: it returns every active
 * solo task with its achievement, availability and preview content.
 * `get_user_individual_tasks` returns only the rows that already have a
 * progress record, and it carries none of those descriptive columns — so its
 * rows are merged *over* the visible row rather than replacing it. A straight
 * replace would blank `achievement_id` (started tasks then vanish from the
 * achievement filter) along with the preview fields.
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

/** Drops the keys a payload simply doesn't carry, so a merge can't blank them. */
function definedOnly(item: TaskTableItem): Partial<TaskTableItem> {
  return Object.fromEntries(
    Object.entries(item).filter(([, value]) => value !== undefined)
  ) as Partial<TaskTableItem>;
}

function toTableItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task: any,
  fallbackAvailable: boolean
): TaskTableItem {
  const status = toUIStatus(task.progress_status ?? task.status ?? null);

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

/**
 * Solo tasks have no assignee. The responsible slot only marks a task the
 * student already picked up, so the table offers "View Info" instead of
 * another "Start" — the column itself is hidden for this economy. It is
 * derived from the merged status so it can never be inherited stale.
 */
function withResponsible(
  task: TaskTableItem,
  owner: MyJourneyTaskOwner
): TaskTableItem {
  if (task.status === "Not Started") {
    return { ...task, responsible: undefined };
  }

  return {
    ...task,
    responsible: {
      name: owner.name ?? "You",
      avatar: owner.avatarUrl ?? "",
      date: task.assignedAt ?? "",
    },
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

  // Descriptive pass: every visible solo task.
  rows(availableTasks).forEach((task) => {
    taskMap.set(task.task_id, toTableItem(task, false));
  });

  // Progress pass: merge over the visible row, keeping its achievement,
  // availability and preview fields wherever this payload has nothing to say.
  rows(individualTasks).forEach((task) => {
    const previous = taskMap.get(task.task_id);
    const progress = definedOnly(
      toTableItem(task, previous?.isAvailable ?? true)
    );
    taskMap.set(task.task_id, { ...previous, ...progress } as TaskTableItem);
  });

  return Array.from(taskMap.values()).map((task) =>
    withResponsible(task, owner)
  );
}
