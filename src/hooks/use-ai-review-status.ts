"use client";

import { useQuery } from "@tanstack/react-query";
import { getAiReviewStatus, type AiReviewStatus } from "@/lib/database";

export const aiReviewStatusKey = (progressId: string) =>
  ["ai-review", "status", progressId] as const;

const IN_FLIGHT = new Set(["queued", "running"]);

/**
 * Polls the latest AI review attempt while it is in flight.
 * 3 s for the first 5 minutes, then 15 s. Stops when the review is final.
 */
export function useAiReviewStatus(
  progressId: string | null,
  opts: { active: boolean }
) {
  return useQuery<AiReviewStatus | null>({
    queryKey: aiReviewStatusKey(progressId ?? "none"),
    queryFn: () => getAiReviewStatus(progressId as string),
    enabled: !!progressId && opts.active,
    staleTime: 0,
    refetchInterval: (query) => {
      const s = query.state.data;
      if (!s || !IN_FLIGHT.has(s.status)) return false;
      const ageMs = Date.now() - new Date(s.created_at).getTime();
      return ageMs > 5 * 60_000 ? 15_000 : 3_000;
    },
  });
}
