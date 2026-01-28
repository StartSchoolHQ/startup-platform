/**
 * Status Mapping Utility
 * Provides consistent status value mapping across the application
 * to prevent UI-database disconnects and ensure data consistency
 */

// Database status types (from task_progress.status enum)
export type DatabaseTaskStatus =
  | "not_started"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "rejected"
  | "revision_required"
  | "cancelled";

// API recurring task status types
export type RecurringTaskStatus =
  | "available"
  | "in_progress"
  | "pending_review"
  | "cooldown";

// UI display status types (for TaskTableItem)
export type UITaskStatus =
  | "Not Started"
  | "In Progress"
  | "Peer Review"
  | "Finished"
  | "Not Accepted"
  | "Cooldown"
  | "Available";

// StatusBadge component status types
export type BadgeStatus =
  | "not_started"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "rejected"
  | "revision_required"
  | "cancelled"
  | "cooldown";

/**
 * Maps recurring task API status to internal database-style status
 */
export function mapRecurringStatusToDatabase(
  status: RecurringTaskStatus
): DatabaseTaskStatus {
  switch (status) {
    case "available":
      return "not_started";
    case "in_progress":
      return "in_progress";
    case "pending_review":
      return "pending_review";
    case "cooldown":
      return "approved"; // Note: This is for internal consistency only
    default:
      return "not_started";
  }
}

/**
 * Maps recurring task API status to UI display status
 */
export function mapRecurringStatusToUI(
  status: RecurringTaskStatus,
  hasBeenCompletedBefore: boolean = false
): UITaskStatus {
  switch (status) {
    case "available":
      // Differentiate between never-started and available-again recurring tasks
      return hasBeenCompletedBefore ? "Available" : "Not Started";
    case "in_progress":
      return "In Progress";
    case "pending_review":
      return "Peer Review";
    case "cooldown":
      return "Cooldown"; // Proper cooldown display (not "Finished")
    default:
      return "Not Started";
  }
}

/**
 * Maps database status to UI display status
 */
export function mapDatabaseStatusToUI(
  status: DatabaseTaskStatus,
  isRecurring: boolean = false
): UITaskStatus {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "in_progress":
      return "In Progress";
    case "pending_review":
      return "Peer Review";
    case "approved":
      return "Finished"; // Show as Finished for all approved tasks
    case "rejected":
    case "revision_required":
      return "Not Accepted";
    case "cancelled":
      return "Not Started";
    default:
      return "Not Started";
  }
}

/**
 * Maps UI status to StatusBadge component status
 */
export function mapUIStatusToBadge(status: UITaskStatus): BadgeStatus {
  switch (status) {
    case "Not Started":
      return "not_started";
    case "In Progress":
      return "in_progress";
    case "Peer Review":
      return "pending_review";
    case "Finished":
      return "approved";
    case "Not Accepted":
      return "rejected";
    case "Cooldown":
      return "cooldown";
    case "Available":
      return "not_started"; // Available tasks use the same badge style as "Not Started"
    default:
      return "not_started";
  }
}

/**
 * Maps recurring task status to StatusBadge component status
 */
export function mapRecurringStatusToBadge(
  status: RecurringTaskStatus
): BadgeStatus {
  switch (status) {
    case "available":
      return "not_started";
    case "in_progress":
      return "in_progress";
    case "pending_review":
      return "pending_review";
    case "cooldown":
      return "cooldown";
    default:
      return "not_started";
  }
}

/**
 * Validates status consistency for debugging
 */
export function validateStatusConsistency(task: {
  status?: string;
  recurring_status?: string;
  is_recurring?: boolean;
  title?: string;
}): string[] {
  const issues: string[] = [];

  if (task.is_recurring && !task.recurring_status) {
    issues.push("Recurring task missing recurring_status");
  }

  if (!task.is_recurring && task.recurring_status) {
    issues.push("Non-recurring task has recurring_status");
  }

  if (task.recurring_status === "cooldown" && task.status === "approved") {
    // This is actually correct mapping, but worth noting
    console.debug("Cooldown task mapped to approved status for:", task.title);
  }

  return issues;
}

/**
 * Gets the appropriate action for a task based on its status
 */
export function getTaskAction(
  status: UITaskStatus,
  isRecurring: boolean = false
): "complete" | "done" | "restart" {
  switch (status) {
    case "Not Started":
      return isRecurring ? "restart" : "complete";
    case "In Progress":
      return "complete";
    case "Peer Review":
      return "done";
    case "Finished":
      return "done";
    case "Not Accepted":
      return "complete";
    case "Cooldown":
      return "restart";
    default:
      return "complete";
  }
}
