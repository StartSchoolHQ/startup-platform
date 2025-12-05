import { createClient } from "@/lib/supabase/client";
import { getUserNotifications, markNotificationSeen } from "./database";

export interface NotificationData {
  taskId?: string;
  taskTitle?: string;
  reviewerId?: string;
  reviewDecision?: string;
  feedback?: string;
  teamId?: string;
  teamName?: string;
  achievementId?: string;
  achievementName?: string;
  inviterName?: string;
  role?: string;
}

export interface PersistentNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: NotificationData | null;
  read_at: string | null;
  created_at: string | null;
  source: "persistent";
  icon?: string;
}

export interface MetadataNotification {
  type: "peer_review" | "team_invitation";
  id: string;
  message: string;
  created_at?: string | null;
  source: "metadata";
}

export type UnifiedNotification = PersistentNotification | MetadataNotification;

// Create a new persistent notification (placeholder until types are properly resolved)
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message?: string,
  data?: NotificationData
): Promise<string> {
  // Database triggers are working to create notifications automatically
  // This function is a placeholder until Supabase client types include the RPC functions
  console.log("Creating notification:", { userId, type, title, message, data });
  return "placeholder-id";
}

// Mark a persistent notification as read
export async function markPersistentNotificationRead(
  notificationId: string
): Promise<boolean> {
  const supabase = createClient();

  try {
    // Use direct update since the RPC function might not be in generated types
    const { error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("notifications" as any)
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in markPersistentNotificationRead:", error);
    return false;
  }
}

// Get persistent notifications from the database
async function getPersistentNotifications(
  userId: string
): Promise<PersistentNotification[]> {
  const supabase = createClient();

  try {
    // Use manual query since the notifications table might not be in generated types yet
    const { data: notifications, error } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("notifications" as any)
      .select("*")
      .eq("user_id", userId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching persistent notifications:", error);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (notifications || []).map(
      (notif: any): PersistentNotification => ({
        id: notif.id as string,
        type: notif.type as string,
        title: notif.title as string,
        message: notif.message as string,
        data: notif.data as NotificationData | null,
        read_at: notif.read_at as string | null,
        created_at: notif.created_at as string,
        source: "persistent",
        // Add icon based on notification type
        icon:
          notif.type === "peer_review_approved"
            ? "check-circle"
            : notif.type === "peer_review_rejected"
            ? "x-circle"
            : notif.type === "peer_review_resubmission"
            ? "refresh-cw"
            : notif.type === "invitation"
            ? "users"
            : "bell",
      })
    );
  } catch (error) {
    console.error("Error in getPersistentNotifications:", error);
    return [];
  }
}

// Main unified notification interface
export async function getNotifications(
  userId: string
): Promise<UnifiedNotification[]> {
  try {
    // Get both persistent and metadata notifications
    const [persistentNotifications, metadataNotifications] = await Promise.all([
      getPersistentNotifications(userId),
      getUserNotifications(),
    ]);

    // Convert metadata notifications to unified format
    const unifiedMetadataNotifications: UnifiedNotification[] =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadataNotifications.map((notif: any) => ({
        ...notif,
        created_at: notif.timestamp || notif.created_at,
        source: "metadata" as const,
      }));

    // Combine all notifications
    const allNotifications: UnifiedNotification[] = [
      ...persistentNotifications,
      ...unifiedMetadataNotifications,
    ];

    // Sort by creation date (newest first)
    return allNotifications.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function getNotificationCount(userId: string): Promise<number> {
  const notifications = await getNotifications(userId);
  return notifications.length;
}

// Export legacy functions for backward compatibility
export { markNotificationSeen };
