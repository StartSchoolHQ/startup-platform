import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  getNotifications,
  getNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  type UnifiedNotification,
} from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  const listKey = ["notifications", "list", userId];
  const countKey = ["notifications", "count", userId];

  // Query for notifications list
  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: listKey,
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
    queryKey: countKey,
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

  // Mark a single notification as read (optimistic removal, rollback on error)
  const markAsReadMutation = useMutation({
    retry: 0,
    mutationFn: async (notificationId: string) => {
      await markNotificationRead(notificationId);
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: countKey });

      const previousList =
        queryClient.getQueryData<UnifiedNotification[]>(listKey);
      const previousCount = queryClient.getQueryData<number>(countKey);

      queryClient.setQueryData<UnifiedNotification[]>(listKey, (old = []) =>
        old.filter((n) => n.id !== notificationId)
      );
      queryClient.setQueryData<number>(countKey, (old = 0) =>
        Math.max(0, old - 1)
      );

      return { previousList, previousCount };
    },
    onError: (error, _notificationId, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(listKey, context.previousList);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(countKey, context.previousCount);
      }
      console.error("Error marking notification as read:", error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: countKey });
    },
  });

  // Mark all notifications as read in a single bulk update
  const markAllAsReadMutation = useMutation({
    retry: 0,
    mutationFn: async () => {
      if (!userId) throw new Error("User not found");
      await markAllNotificationsRead(userId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: countKey });

      const previousList =
        queryClient.getQueryData<UnifiedNotification[]>(listKey);
      const previousCount = queryClient.getQueryData<number>(countKey);

      queryClient.setQueryData<UnifiedNotification[]>(listKey, []);
      queryClient.setQueryData<number>(countKey, 0);

      return { previousList, previousCount };
    },
    onError: (error, _variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(listKey, context.previousList);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(countKey, context.previousCount);
      }
      console.error("Error marking all notifications as read:", error);
      toast.error("Couldn't mark notifications as read. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: countKey });
    },
  });

  const markNotificationAsRead = async (notificationId: string) => {
    if (!userId) return false;

    try {
      await markAsReadMutation.mutateAsync(notificationId);
      return true;
    } catch {
      // Rollback + logging handled in the mutation's onError
      return false;
    }
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
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    isMarkingAllRead: markAllAsReadMutation.isPending,
    refresh,
  };
}

// Helper to invalidate notifications from anywhere
export function invalidateNotifications(
  queryClient: QueryClient,
  userId?: string
) {
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
