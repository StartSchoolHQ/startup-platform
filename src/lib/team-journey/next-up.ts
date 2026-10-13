import {
  sortTeamAchievements,
  type TeamDetailTask,
} from "@/lib/team-journey/detail-transforms";

/** Statuses that count as "open work" for the Continue card. */
const OPEN_STATUSES = new Set(["in_progress", "pending_review", "rejected"]);

export interface TeamNextUp {
  /** Open team tasks, most recently started first. */
  inProgress: TeamDetailTask[];
  /** The one task to pick up next, or null when nothing is untouched. */
  nextUp: TeamDetailTask | null;
}

/** A task nobody has touched yet, or a recurring one that is available again. */
function isUntouched(task: TeamDetailTask) {
  if (task.status === "not_started") return true;
  return task.is_recurring && task.status === "approved" && task.is_available;
}

/** 0 = assigned to the viewer, 1 = unassigned, 2 = someone else's. */
function assignmentRank(task: TeamDetailTask, userId: string | undefined) {
  if (!task.assigned_to_user_id) return 1;
  return task.assigned_to_user_id === userId ? 0 : 2;
}

/**
 * Continue + Next up for a team, computed from the task rows the page already
 * holds (no RPC). Next up walks the achievements in their card order (Idea
 * Validation first, Recurring Tasks last) and takes the first untouched task,
 * preferring one assigned to the viewer, then unassigned, then anyone else's.
 * Tasks without an achievement are considered last.
 */
export function pickTeamNextUp(
  tasks: TeamDetailTask[],
  achievements: {
    achievement_id: string;
    achievement_name: string;
    sort_order?: number | null;
  }[],
  userId: string | undefined
): TeamNextUp {
  const inProgress = tasks
    .filter((t) => OPEN_STATUSES.has(t.status))
    .sort((a, b) => {
      if (!a.started_at && !b.started_at) return 0;
      if (!a.started_at) return 1;
      if (!b.started_at) return -1;
      return b.started_at.localeCompare(a.started_at);
    });

  const order = new Map(
    sortTeamAchievements(achievements).map((a, i) => [a.achievement_id, i])
  );
  const untouched = tasks.filter(isUntouched);
  const nextUp =
    untouched
      .map((t, i) => ({
        t,
        i,
        phase: t.achievement_id
          ? (order.get(t.achievement_id) ?? order.size)
          : order.size,
        rank: assignmentRank(t, userId),
      }))
      .sort((a, b) => a.phase - b.phase || a.rank - b.rank || a.i - b.i)[0]
      ?.t ?? null;

  return { inProgress, nextUp };
}
