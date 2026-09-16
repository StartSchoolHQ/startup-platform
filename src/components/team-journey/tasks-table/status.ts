import type { TaskStatus } from "@/components/ui/status-badge";
import type { TaskTableItem } from "@/types/team-journey";

export const DIFFICULTY_LEVEL: Record<TaskTableItem["difficulty"], number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

export function toBadgeStatus(status: TaskTableItem["status"]): TaskStatus {
  switch (status) {
    case "Finished":
      return "approved";
    case "Not Accepted":
      return "rejected";
    case "Peer Review":
    case "Reviewing":
      return "pending_review";
    case "In Progress":
      return "in_progress";
    case "Cooldown":
      return "cooldown";
    default:
      return "not_started";
  }
}

/**
 * Recurring task in its cooldown window (progress bar) or just out of it
 * ("Available again") — both render through TaskCooldownStatus.
 */
export function isCoolingDown(task: TaskTableItem): boolean {
  return (
    (task.status === "Cooldown" || task.status === "Available") &&
    !!task.isRecurring &&
    !!task.nextAvailableAt
  );
}
