"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProfileCard } from "@/types/profile-card";

export const profileCardKeys = {
  card: (userId: string | null) => ["profile-card", userId] as const,
};

/**
 * One round trip for the leaderboard profile dialog. `null` data means the
 * user is not visible to the caller (archived or unknown).
 */
export function useProfileCard(userId: string | null) {
  const { data, isLoading, isError } = useQuery({
    queryKey: profileCardKeys.card(userId),
    queryFn: async (): Promise<ProfileCard | null> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_user_profile_card_v1", {
        p_user_id: userId as string,
      });
      if (error) throw new Error(error.message);
      return (data as unknown as ProfileCard | null) ?? null;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
  return { data, isLoading, isError };
}
