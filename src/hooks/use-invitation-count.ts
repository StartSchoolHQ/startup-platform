import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInvitationCount } from "@/lib/database";

export function useInvitationCount(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: count = 0 } = useQuery({
    queryKey: ["invitations", "count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      return await getInvitationCount(userId);
    },
    enabled: !!userId,
    staleTime: 30000, // 30s - invitations change less frequently
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refresh every minute
  });

  const refreshCount = () => {
    queryClient.invalidateQueries({
      queryKey: ["invitations", "count", userId],
    });
  };

  return { count, refreshCount };
}

// Helper to invalidate invitation count from anywhere
export function invalidateInvitationCount(queryClient: any, userId?: string) {
  if (userId) {
    queryClient.invalidateQueries({
      queryKey: ["invitations", "count", userId],
    });
  } else {
    queryClient.invalidateQueries({ queryKey: ["invitations", "count"] });
  }
}

// Helper to invalidate invitation lists
export function invalidateInvitationLists(queryClient: any) {
  queryClient.invalidateQueries({ queryKey: ["invitations", "list"] });
}
