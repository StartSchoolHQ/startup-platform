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

export interface JourneySettings {
  myJourney: boolean;
  teamJourney: boolean;
}

/** Shown while settings load and whenever the row is missing/unreadable. */
export const JOURNEY_DEFAULTS: JourneySettings = {
  myJourney: false,
  teamJourney: true,
};

export const JOURNEYS_QUERY_KEY = ["platform-settings", "journeys"];

function readFlag(
  raw: Record<string, unknown>,
  key: string,
  fallback: boolean
): boolean {
  return typeof raw[key] === "boolean" ? (raw[key] as boolean) : fallback;
}

/** Maps the `journeys` jsonb value (snake_case) to camelCase flags. */
export function toJourneySettings(value: unknown): JourneySettings {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    myJourney: readFlag(raw, "my_journey", JOURNEY_DEFAULTS.myJourney),
    teamJourney: readFlag(raw, "team_journey", JOURNEY_DEFAULTS.teamJourney),
  };
}

async function fetchJourneySettings(): Promise<JourneySettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "journeys")
    .single();

  if (error) {
    throw new Error(`Failed to load platform settings: ${error.message}`);
  }

  return toJourneySettings(data?.value);
}

export function usePlatformSettings(): {
  data: JourneySettings;
  isLoading: boolean;
} {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Same SSR-hydration guard as AppProvider: the query must not run
    // until the client has mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const { data = JOURNEY_DEFAULTS, isLoading } = useQuery({
    queryKey: JOURNEYS_QUERY_KEY,
    queryFn: fetchJourneySettings,
    enabled: mounted,
    staleTime: 5 * 60 * 1000,
  });

  // Disabled queries report isLoading === false, so gate on mount too.
  return { data, isLoading: isLoading || !mounted };
}

export function useSetJourneys(): UseMutationResult<
  JourneySettings,
  Error,
  JourneySettings
> {
  const queryClient = useQueryClient();

  return useMutation<JourneySettings, Error, JourneySettings>({
    mutationFn: async (next) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("set_platform_setting_v1", {
        p_key: "journeys",
        p_value: { my_journey: next.myJourney, team_journey: next.teamJourney },
      });

      if (error) {
        throw new Error(error.message);
      }

      return toJourneySettings(data);
    },
    retry: 0,
    onSuccess: () => {
      toast.success("Programme phase updated");
      queryClient.invalidateQueries({ queryKey: JOURNEYS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(
        `Could not update the programme phase — ${error.message}. Only admins can change this; try again.`
      );
    },
  });
}
