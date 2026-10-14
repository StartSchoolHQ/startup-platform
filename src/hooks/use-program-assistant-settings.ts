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
  PROGRAM_ASSISTANT_DEFAULTS,
  parseProgramAssistantSettings,
  toProgramAssistantSettingsRow,
  type ProgramAssistantSettings,
} from "@/lib/program-assistant/settings";

export const PROGRAM_ASSISTANT_SETTINGS_KEY = [
  "platform-settings",
  "program_assistant",
];

export function useProgramAssistantSettings(): {
  data: ProgramAssistantSettings;
  isLoading: boolean;
  isError: boolean;
} {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const {
    data = PROGRAM_ASSISTANT_DEFAULTS,
    isLoading,
    isError,
  } = useQuery({
    queryKey: PROGRAM_ASSISTANT_SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("platform_settings")
        .select("value")
        .eq("key", "program_assistant")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return parseProgramAssistantSettings(data?.value);
    },
    enabled: mounted,
    staleTime: 5 * 60 * 1000,
  });

  return { data, isLoading: isLoading || !mounted, isError };
}

/** Admin-only write through `set_platform_setting_v1`. */
export function useSetProgramAssistantSettings(): UseMutationResult<
  ProgramAssistantSettings,
  Error,
  Partial<ProgramAssistantSettings>
> {
  const queryClient = useQueryClient();
  const { data: current } = useProgramAssistantSettings();

  return useMutation<
    ProgramAssistantSettings,
    Error,
    Partial<ProgramAssistantSettings>
  >({
    mutationFn: async (patch) => {
      const next = { ...current, ...patch };
      const { data, error } = await createClient().rpc(
        "set_platform_setting_v1",
        {
          p_key: "program_assistant",
          p_value: toProgramAssistantSettingsRow(next),
        }
      );
      if (error) throw new Error(error.message);
      return parseProgramAssistantSettings(data);
    },
    retry: 0,
    onSuccess: (data) => {
      toast.success("Program assistant settings updated");
      queryClient.setQueryData(PROGRAM_ASSISTANT_SETTINGS_KEY, data);
      queryClient.invalidateQueries({
        queryKey: PROGRAM_ASSISTANT_SETTINGS_KEY,
      });
    },
    onError: (error) => {
      toast.error(
        `Could not update program assistant settings — ${error.message}. Only admins can change this.`
      );
    },
  });
}
