"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { MyJourneyOverview } from "@/types/dashboard";

/**
 * Solo-economy dashboard data in one round trip. The RPC is guarded server
 * side (self or admin only), so the caller just passes the profile id it
 * already has and waits for it — `enabled` keeps the query off until then.
 */
export function useMyJourneyOverview(userId: string | undefined) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "my-journey", userId],
    queryFn: async (): Promise<MyJourneyOverview> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_my_journey_overview_v1", {
        p_user_id: userId!,
      });
      if (error) throw error;
      return data as unknown as MyJourneyOverview;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  return { data, isLoading, isError };
}
