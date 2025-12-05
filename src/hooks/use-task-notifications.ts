import { useState, useEffect, useCallback } from "react";
import {
  getNotifications,
  getNotificationCount,
  markPersistentNotificationRead,
  markNotificationSeen,
  type UnifiedNotification,
} from "@/lib/notifications";

// Simple event emitter for notification updates
class NotificationManager {
  private listeners: (() => void)[] = [];

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  refresh() {
    this.listeners.forEach((listener) => listener());
  }
}

export const notificationManager = new NotificationManager();

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setCount(0);
      return;
    }

    setLoading(true);
    try {
      const [notifs, notifCount] = await Promise.all([
        getNotifications(userId),
        getNotificationCount(userId),
      ]);

      setNotifications(notifs);
      setCount(notifCount);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(() => {
      loadNotifications();
    });
    return unsubscribe;
  }, [loadNotifications]);

  const markNotificationAsRead = useCallback(
    async (notificationId: string, source?: "persistent" | "metadata") => {
      if (!userId) return false;

      // Auto-detect source from notification if not provided
      let notificationSource = source;
      if (!notificationSource) {
        const notification = notifications.find((n) => n.id === notificationId);
        notificationSource = notification?.source || "metadata";
      }

      let success = false;
      if (notificationSource === "persistent") {
        success = await markPersistentNotificationRead(notificationId);
      } else {
        success = await markNotificationSeen(notificationId, userId);
      }

      if (success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setCount((prev) => Math.max(0, prev - 1));
      }
      return success;
    },
    [userId, notifications]
  );

  const refresh = useCallback(() => {
    notificationManager.refresh();
  }, []);

  return {
    notifications,
    count,
    loading,
    markAsRead: markNotificationAsRead,
    markAsSeen: markNotificationAsRead, // Provide both interfaces for compatibility
    refresh,
  };
}

// Legacy exports for backwards compatibility during transition
export const taskNotificationManager = notificationManager;
export const useTaskNotifications = useNotifications;
