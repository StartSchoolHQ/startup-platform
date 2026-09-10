import { createClient } from "@/lib/supabase/client";

export interface NotificationData {
  // Task-related routing
  taskId?: string;
  task_id?: string; // Alternative naming for consistency
  task_progress_id?: string; // Specific for peer review
  taskTitle?: string;
  task_title?: string;

  // Team-related routing
  teamId?: string;
  team_id?: string;
  teamName?: string;

  // Invitation routing
  invitationId?: string;
  invitation_id?: string;

  // Review-specific data
  reviewerId?: string;
  reviewer_id?: string;
  reviewDecision?: string;
  decision?: string;
  feedback?: string;

  // Routing overrides
  target_route?: string; // Custom route override
  target_tab?: string; // Specific tab to open

  // Legacy fields
  role?: string;
  achievementId?: string;
  achievementName?: string;
  inviterName?: string;

  // Auto-decline specific
  count?: number;
  teamNames?: string;
  reason?: string;
  joinedTeamId?: string;
  response?: string;
  respondedAt?: string;
  inviteeName?: string;
  context?: string;
}

// All notifications live in the `notifications` table (written by DB
// triggers). The legacy task_progress-metadata notification system was
// removed — it had been disabled and always returned an empty list.
export interface UnifiedNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: NotificationData | null;
  read_at: string | null;
  created_at: string | null;
  icon: string;
}

// Enhanced icon mapping
function getNotificationIcon(type: string): string {
  switch (type) {
    case "invitation_accepted":
      return "user-check";
    case "invitation_declined":
      return "user-x";
    case "invitations_auto_declined":
      return "users-x";
    case "peer_review_approved":
      return "check-circle";
    case "peer_review_rejected":
      return "x-circle";
    case "peer_review_resubmission":
      return "refresh-cw";
    case "weekly_report_reminder_2day":
    case "weekly_report_reminder_1day":
      return "calendar-clock";
    case "weekly_report_penalty":
      return "alert-triangle";
    case "weekly_report_refund":
      return "check-circle";
    case "invitation":
      return "users";
    default:
      return "bell";
  }
}

// Get unread notifications for a user (newest first)
export async function getNotifications(
  userId: string
): Promise<UnifiedNotification[]> {
  const supabase = createClient();

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return (notifications ?? []).map(
    (notif): UnifiedNotification => ({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      data: notif.data as NotificationData | null,
      read_at: notif.read_at,
      created_at: notif.created_at,
      icon: getNotificationIcon(notif.type),
    })
  );
}

// Count unread notifications without fetching the rows
export async function getNotificationCount(userId: string): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("Error counting notifications:", error);
    return 0;
  }

  return count ?? 0;
}

// Mark a single notification as read
export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) {
    throw new Error("Failed to mark notification as read: " + error.message);
  }
}

// Mark all of a user's unread notifications as read in one query
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(
      "Failed to mark all notifications as read: " + error.message
    );
  }
}
