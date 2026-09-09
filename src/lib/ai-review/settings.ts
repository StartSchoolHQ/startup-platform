import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AiReviewSettings } from "./types";

export const AI_REVIEW_DEFAULTS: AiReviewSettings = {
  enabled: true,
  mode: "ai",
  model: "gpt-5.4",
  confidenceThreshold: 0.75,
  workerUrl: "",
  maxFileMb: 25,
  maxPdfPages: 40,
  attemptFlagThreshold: 5,
};

export function parseAiReviewSettings(value: unknown): AiReviewSettings {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const num = (k: string, d: number) =>
    typeof raw[k] === "number" ? (raw[k] as number) : d;
  const str = (k: string, d: string) =>
    typeof raw[k] === "string" ? (raw[k] as string) : d;
  return {
    enabled:
      typeof raw.enabled === "boolean"
        ? raw.enabled
        : AI_REVIEW_DEFAULTS.enabled,
    mode: raw.mode === "auto_approve" ? "auto_approve" : "ai",
    model: str("model", AI_REVIEW_DEFAULTS.model),
    confidenceThreshold: num(
      "confidence_threshold",
      AI_REVIEW_DEFAULTS.confidenceThreshold
    ),
    workerUrl: str("worker_url", ""),
    maxFileMb: num("max_file_mb", AI_REVIEW_DEFAULTS.maxFileMb),
    maxPdfPages: num("max_pdf_pages", AI_REVIEW_DEFAULTS.maxPdfPages),
    attemptFlagThreshold: num(
      "attempt_flag_threshold",
      AI_REVIEW_DEFAULTS.attemptFlagThreshold
    ),
  };
}

export async function getAiReviewSettings(
  supabase: SupabaseClient<Database>
): Promise<AiReviewSettings> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "ai_review")
    .single();
  if (error) throw new Error(`ai_review settings unreadable: ${error.message}`);
  return parseAiReviewSettings(data.value);
}
