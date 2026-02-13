/**
 * Notification Functions
 *
 * Handles:
 * - User notifications retrieval
 * - Notification counting
 * - Notification marking as seen
 */

import { createClient } from "../supabase/client";

export interface Notification {
  id: string;
  type: "review_completed" | "review_rejected";
  title: string;
  taskId: string;
  taskTitle: string;
  timestamp: string;
  icon: "check-circle" | "x-circle";
}

/**
 * Get user notifications
 * Currently disabled to prevent duplicates with database trigger notifications
 */
export async function getUserNotifications(): Promise<Notification[]> {
  const notifications: Notification[] = [];

  // DISABLED: Metadata-based notifications are redundant with database trigger notifications
  // Database triggers (notify_submitter_on_review_completion, notify_reviewer_on_resubmission)
  // already create persistent notifications in the notifications table
  // Keeping this metadata system creates duplicates

  return notifications;
}

/**
 * Get notification count for badge display
 */
export async function getNotificationCount(): Promise<number> {
  const notifications = await getUserNotifications();
  return notifications.length;
}

/**
 * Mark notification as seen
 */
export async function markNotificationSeen(
  taskProgressId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();

  try {
    // Get current metadata
    const { data: task } = await supabase
      .from("task_progress")
      .select("metadata")
      .eq("id", taskProgressId)
      .single();

    const metadata = (task?.metadata as Record<string, unknown>) || {};
    const seenByUsers = (metadata.seen_by_users as string[]) || [];

    if (!seenByUsers.includes(userId)) {
      seenByUsers.push(userId);

      const { error } = await supabase
        .from("task_progress")
        .update({
          metadata: { ...metadata, seen_by_users: seenByUsers },
        })
        .eq("id", taskProgressId);

      if (error) {
        throw new Error(
          "Failed to mark notification as seen: " + error.message
        );
      }
    }
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Failed to mark notification as seen");
  }
}
