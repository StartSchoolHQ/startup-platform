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
  ASSISTANT_DEFAULTS,
  parseAssistantSettings,
  toAssistantSettingsRow,
} from "@/lib/assistant/settings";
import type { AssistantSettings } from "@/lib/assistant/types";

export const ASSISTANT_SETTINGS_KEY = ["platform-settings", "assistant"];

/** `platform_settings.assistant` — readable by every signed-in user. */
export function useAssistantSettings(): {
  data: AssistantSettings;
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
    data = ASSISTANT_DEFAULTS,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ASSISTANT_SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("platform_settings")
        .select("value")
        .eq("key", "assistant")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return parseAssistantSettings(data?.value);
    },
    enabled: mounted,
    staleTime: 5 * 60 * 1000,
  });

  return { data, isLoading: isLoading || !mounted, isError };
}

/** Admin-only write through `set_platform_setting_v1`. */
export function useSetAssistantSettings(): UseMutationResult<
  AssistantSettings,
  Error,
  Partial<AssistantSettings>
> {
  const queryClient = useQueryClient();
  const { data: current } = useAssistantSettings();

  return useMutation<AssistantSettings, Error, Partial<AssistantSettings>>({
    mutationFn: async (patch) => {
      const next = { ...current, ...patch };
      const { data, error } = await createClient().rpc(
        "set_platform_setting_v1",
        { p_key: "assistant", p_value: toAssistantSettingsRow(next) }
      );
      if (error) throw new Error(error.message);
      return parseAssistantSettings(data);
    },
    retry: 0,
    onSuccess: (data) => {
      toast.success("Startie settings updated");
      queryClient.setQueryData(ASSISTANT_SETTINGS_KEY, data);
      queryClient.invalidateQueries({ queryKey: ASSISTANT_SETTINGS_KEY });
    },
    onError: (error) => {
      toast.error(
        `Could not update Startie settings — ${error.message}. Only admins can change this.`
      );
    },
  });
}
