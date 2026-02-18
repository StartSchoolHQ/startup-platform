import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  getNotifications,
  getNotificationCount,
  markPersistentNotificationRead,
  markNotificationSeen,
  type UnifiedNotification,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  // Query for notifications list
  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: ["notifications", "list", userId],
    queryFn: async () => {
      if (!userId) return [];
      return await getNotifications(userId);
    },
    enabled: !!userId,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // 5min fallback poll (safety net if Realtime drops)
  });

  // Query for notification count
  const { data: count = 0 } = useQuery({
    queryKey: ["notifications", "count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      return await getNotificationCount(userId);
    },
    enabled: !!userId,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000,
  });

  // Realtime subscription for instant notifications
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Must set auth token on Realtime WebSocket (SSR client doesn't sync it automatically)
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;

      supabase.realtime.setAuth(token);

      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            queryClient.invalidateQueries({
              queryKey: ["notifications", "list", userId],
            });
            queryClient.invalidateQueries({
              queryKey: ["notifications", "count", userId],
            });
          }
        )
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, queryClient]);

  // Refetch on route change
  useEffect(() => {
    if (userId) {
      queryClient.invalidateQueries({
        queryKey: ["notifications", "list", userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "count", userId],
      });
    }
  }, [pathname, userId, queryClient]);

  // Mutation for marking notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async ({
      notificationId,
      source,
    }: {
      notificationId: string;
      source: "persistent" | "metadata";
    }) => {
      if (!userId) throw new Error("User not found");

      if (source === "persistent") {
        await markPersistentNotificationRead(notificationId);
      } else {
        await markNotificationSeen(notificationId, userId);
      }
    },
    onSuccess: () => {
      // Invalidate both list and count queries
      queryClient.invalidateQueries({
        queryKey: ["notifications", "list", userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications", "count", userId],
      });
    },
    onError: (error) => {
      console.error("Error marking notification as read:", error);
    },
  });

  const markNotificationAsRead = async (
    notificationId: string,
    source?: "persistent" | "metadata"
  ) => {
    if (!userId) return false;

    // Auto-detect source from notification if not provided
    let notificationSource = source;
    if (!notificationSource) {
      const notification = notifications.find((n) => n.id === notificationId);
      notificationSource = notification?.source || "metadata";
    }

    await markAsReadMutation.mutateAsync({
      notificationId,
      source: notificationSource,
    });

    return true;
  };

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["notifications", "list", userId],
    });
    queryClient.invalidateQueries({
      queryKey: ["notifications", "count", userId],
    });
  };

  return {
    notifications,
    count,
    loading,
    markAsRead: markNotificationAsRead,
    markAsSeen: markNotificationAsRead,
    refresh,
  };
}

// Helper to invalidate notifications from anywhere
export function invalidateNotifications(queryClient: any, userId?: string) {
  if (userId) {
    queryClient.invalidateQueries({
      queryKey: ["notifications", "list", userId],
    });
    queryClient.invalidateQueries({
      queryKey: ["notifications", "count", userId],
    });
  } else {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }
}

// Legacy exports for backwards compatibility
export const useTaskNotifications = useNotifications;
