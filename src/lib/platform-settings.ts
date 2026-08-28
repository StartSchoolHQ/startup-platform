// Server-only: uses the cookie-based Supabase server client.
// Do not import from client components — use `usePlatformSettings()` instead.
import { createClient } from "@/lib/supabase/server";

export interface JourneySettings {
  myJourney: boolean;
  teamJourney: boolean;
}

/** Used while settings are unavailable — keeps the platform in team phase. */
export const JOURNEY_DEFAULTS: JourneySettings = {
  myJourney: false,
  teamJourney: true,
};

function readFlag(
  raw: Record<string, unknown>,
  key: string,
  fallback: boolean
): boolean {
  return typeof raw[key] === "boolean" ? (raw[key] as boolean) : fallback;
}

/**
 * Server-side read of the `journeys` platform setting.
 * Never throws — falls back to JOURNEY_DEFAULTS so pages still render.
 */
export async function getJourneySettings(): Promise<JourneySettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "journeys")
      .single();

    if (error || !data) return JOURNEY_DEFAULTS;

    const value = data.value;
    const raw =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};

    return {
      myJourney: readFlag(raw, "my_journey", JOURNEY_DEFAULTS.myJourney),
      teamJourney: readFlag(raw, "team_journey", JOURNEY_DEFAULTS.teamJourney),
    };
  } catch {
    return JOURNEY_DEFAULTS;
  }
}
