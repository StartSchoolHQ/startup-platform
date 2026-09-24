import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AssistantSettings, ReasoningEffort } from "./types";

export const ASSISTANT_DEFAULTS: AssistantSettings = {
  enabled: false,
  model: "gpt-5.4-mini",
  dailyLimit: 25,
  historyTurns: 10,
  reasoningEffort: "low",
};

const EFFORTS: readonly ReasoningEffort[] = ["low", "medium", "high"];

/** Same defaults-and-fallback shape as `parseAiReviewSettings`. */
export function parseAssistantSettings(value: unknown): AssistantSettings {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const positiveInt = (k: string, d: number) => {
    const v = raw[k];
    return typeof v === "number" && Number.isInteger(v) && v >= 1 ? v : d;
  };
  const effort = raw.reasoning_effort;
  return {
    enabled:
      typeof raw.enabled === "boolean"
        ? raw.enabled
        : ASSISTANT_DEFAULTS.enabled,
    model:
      typeof raw.model === "string" && raw.model.trim()
        ? raw.model
        : ASSISTANT_DEFAULTS.model,
    dailyLimit: positiveInt("daily_limit", ASSISTANT_DEFAULTS.dailyLimit),
    historyTurns: positiveInt("history_turns", ASSISTANT_DEFAULTS.historyTurns),
    reasoningEffort: EFFORTS.includes(effort as ReasoningEffort)
      ? (effort as ReasoningEffort)
      : ASSISTANT_DEFAULTS.reasoningEffort,
  };
}

/** camelCase settings → the snake_case jsonb row `set_platform_setting_v1` stores. */
export function toAssistantSettingsRow(
  s: AssistantSettings
): Record<string, string | number | boolean> {
  return {
    enabled: s.enabled,
    model: s.model,
    daily_limit: s.dailyLimit,
    history_turns: s.historyTurns,
    reasoning_effort: s.reasoningEffort,
  };
}

export async function getAssistantSettings(
  supabase: SupabaseClient<Database>
): Promise<AssistantSettings> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "assistant")
    .maybeSingle();
  if (error) throw new Error(`assistant settings unreadable: ${error.message}`);
  return parseAssistantSettings(data?.value);
}
