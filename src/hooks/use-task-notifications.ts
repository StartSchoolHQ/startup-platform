import { useState, useEffect, useCallback } from "react";
import {
  getUserNotifications,
  getNotificationCount,
  markNotificationSeen,
  type Notification,
} from "@/lib/database";

// Notification hook types
export interface NotificationState {
  notifications: Notification[];
  count: number;
  loading: boolean;
}

// Simple event emitter for task notification updates
class TaskNotificationManager {
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

export const taskNotificationManager = new TaskNotificationManager();

export function useNotifications(userId: string | undefined) {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    count: 0,
    loading: false,
  });

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setState({ notifications: [], count: 0, loading: false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    try {
      const [notifications, count] = await Promise.all([
        getUserNotifications(userId),
        getNotificationCount(userId),
      ]);

      setState({ notifications, count, loading: false });
    } catch (error) {
      console.error("Error loading notifications:", error);
      setState({ notifications: [], count: 0, loading: false });
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const unsubscribe = taskNotificationManager.subscribe(() => {
      loadNotifications();
    });
    return unsubscribe;
  }, [loadNotifications]);

  const refreshNotifications = useCallback(() => {
    taskNotificationManager.refresh();
  }, []);

  const markAsSeen = useCallback(
    async (taskProgressId: string) => {
      if (!userId) return false;

      const success = await markNotificationSeen(taskProgressId, userId);
      if (success) {
        // Remove from local state immediately
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.filter(
            (n) => n.id !== taskProgressId
          ),
          count: prev.count - 1,
        }));
      }
      return success;
    },
    [userId]
  );

  return { ...state, refreshNotifications, markAsSeen };
}

// Keep old hook name for backwards compatibility during transition
export const useTaskNotifications = useNotifications;
