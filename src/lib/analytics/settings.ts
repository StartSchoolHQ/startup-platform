/**
 * `platform_settings.analytics` — the attention-rule thresholds. Mirrors
 * `_analytics_settings_v1()` in SQL: every value is an integer ≥ 1, anything
 * else falls back to the default.
 */
export interface AnalyticsSettings {
  inactiveDays: number;
  stuckDays: number;
  rejections: number;
  lowSentiment: number;
  missedReports: number;
  behindPhases: number;
  dismissDays: number;
}

export const ANALYTICS_DEFAULTS: AnalyticsSettings = {
  inactiveDays: 7,
  stuckDays: 10,
  rejections: 3,
  lowSentiment: 5,
  missedReports: 2,
  behindPhases: 1,
  dismissDays: 7,
};

const KEYS: Record<keyof AnalyticsSettings, string> = {
  inactiveDays: "inactive_days",
  stuckDays: "stuck_days",
  rejections: "rejections",
  lowSentiment: "low_sentiment",
  missedReports: "missed_reports",
  behindPhases: "behind_phases",
  dismissDays: "dismiss_days",
};

export function parseAnalyticsSettings(value: unknown): AnalyticsSettings {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const out = { ...ANALYTICS_DEFAULTS };
  for (const key of Object.keys(KEYS) as (keyof AnalyticsSettings)[]) {
    const v = raw[KEYS[key]];
    if (typeof v === "number" && Number.isInteger(v) && v >= 1) out[key] = v;
  }
  return out;
}

export function toAnalyticsSettingsRow(
  s: AnalyticsSettings
): Record<string, number> {
  const row: Record<string, number> = {};
  for (const key of Object.keys(KEYS) as (keyof AnalyticsSettings)[]) {
    row[KEYS[key]] = s[key];
  }
  return row;
}
