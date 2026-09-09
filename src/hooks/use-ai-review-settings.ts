"use client";

import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  AI_REVIEW_DEFAULTS,
  parseAiReviewSettings,
} from "@/lib/ai-review/settings";
import type { AiReviewSettings } from "@/lib/ai-review/types";

export const AI_REVIEW_SETTINGS_KEY = ["platform-settings", "ai_review"];

function toRow(s: AiReviewSettings) {
  return {
    enabled: s.enabled,
    mode: s.mode,
    model: s.model,
    confidence_threshold: s.confidenceThreshold,
    worker_url: s.workerUrl,
    max_file_mb: s.maxFileMb,
    max_pdf_pages: s.maxPdfPages,
    attempt_flag_threshold: s.attemptFlagThreshold,
  };
}

export function useAiReviewSettings(): {
  data: AiReviewSettings;
  isLoading: boolean;
  isError: boolean;
} {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Same SSR-hydration guard as usePlatformSettings — the query must not
    // run until the client has mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const {
    data = AI_REVIEW_DEFAULTS,
    isLoading,
    isError,
  } = useQuery({
    queryKey: AI_REVIEW_SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("platform_settings")
        .select("value")
        .eq("key", "ai_review")
        .single();
      if (error) throw new Error(error.message);
      return parseAiReviewSettings(data.value);
    },
    enabled: mounted,
    staleTime: 5 * 60 * 1000,
  });

  return { data, isLoading: isLoading || !mounted, isError };
}

export function useSetAiReviewSettings(): UseMutationResult<
  AiReviewSettings,
  Error,
  Partial<AiReviewSettings>
> {
  const queryClient = useQueryClient();
  const { data: current } = useAiReviewSettings();

  return useMutation<AiReviewSettings, Error, Partial<AiReviewSettings>>({
    mutationFn: async (patch) => {
      const next = { ...current, ...patch };
      const { data, error } = await createClient().rpc(
        "set_platform_setting_v1",
        {
          p_key: "ai_review",
          p_value: toRow(next),
        }
      );
      if (error) throw new Error(error.message);
      return parseAiReviewSettings(data);
    },
    retry: 0,
    onSuccess: (data) => {
      toast.success("AI review settings updated");
      queryClient.setQueryData(AI_REVIEW_SETTINGS_KEY, data);
      queryClient.invalidateQueries({ queryKey: AI_REVIEW_SETTINGS_KEY });
    },
    onError: (error) => {
      toast.error(
        `Could not update AI review settings — ${error.message}. Only admins can change this.`
      );
    },
  });
}
