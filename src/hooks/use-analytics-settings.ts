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
  ANALYTICS_DEFAULTS,
  parseAnalyticsSettings,
  toAnalyticsSettingsRow,
  type AnalyticsSettings,
} from "@/lib/analytics/settings";

export const ANALYTICS_SETTINGS_KEY = ["platform-settings", "analytics"];

/** `platform_settings.analytics` — the attention-rule thresholds. */
export function useAnalyticsSettings(): {
  data: AnalyticsSettings;
  isLoading: boolean;
  isError: boolean;
} {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Same SSR-hydration guard as usePlatformSettings.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const {
    data = ANALYTICS_DEFAULTS,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ANALYTICS_SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("platform_settings")
        .select("value")
        .eq("key", "analytics")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return parseAnalyticsSettings(data?.value);
    },
    enabled: mounted,
    staleTime: 5 * 60 * 1000,
  });

  return { data, isLoading: isLoading || !mounted, isError };
}

export function useSetAnalyticsSettings(): UseMutationResult<
  AnalyticsSettings,
  Error,
  Partial<AnalyticsSettings>
> {
  const queryClient = useQueryClient();
  const { data: current } = useAnalyticsSettings();

  return useMutation<AnalyticsSettings, Error, Partial<AnalyticsSettings>>({
    mutationFn: async (patch) => {
      const next = { ...current, ...patch };
      const { data, error } = await createClient().rpc(
        "set_platform_setting_v1",
        { p_key: "analytics", p_value: toAnalyticsSettingsRow(next) }
      );
      if (error) throw new Error(error.message);
      return parseAnalyticsSettings(data);
    },
    retry: 0,
    onSuccess: (data) => {
      toast.success("Attention rules updated");
      queryClient.setQueryData(ANALYTICS_SETTINGS_KEY, data);
      queryClient.invalidateQueries({ queryKey: ANALYTICS_SETTINGS_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
    onError: (error) => {
      toast.error(
        `Could not update the attention rules — ${error.message}. Only admins can change this.`
      );
    },
  });
}
