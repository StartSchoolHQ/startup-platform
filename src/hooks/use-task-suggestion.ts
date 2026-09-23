"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TaskSuggestionInput } from "@/lib/validation-schemas";
import type { MyJourneyPhaseOption } from "@/types/support-inbox";

/** Every active My Journey card, in journey order. Read under the authenticated achievements policy. */
export function useMyJourneyPhases() {
  return useQuery({
    queryKey: ["achievements", "individual", "options"],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<MyJourneyPhaseOption[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("achievements")
        .select("id, name")
        .eq("context", "individual")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Calls suggest_task_v1. The RPC validates again and enforces 5 per 24h. */
export function useSuggestTask() {
  return useMutation({
    retry: 0,
    mutationFn: async (input: TaskSuggestionInput) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("suggest_task_v1", {
        p_achievement_id: input.achievementId,
        p_title: input.title,
        p_description: input.description,
      });
      if (error) throw error;
      return data as { id: string; remaining_today: number };
    },
  });
}
