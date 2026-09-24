import { describe, expect, it } from "vitest";
import {
  ANALYTICS_DEFAULTS,
  parseAnalyticsSettings,
  toAnalyticsSettingsRow,
} from "@/lib/analytics/settings";

describe("parseAnalyticsSettings", () => {
  it("returns the defaults for empty or garbage input", () => {
    expect(parseAnalyticsSettings({})).toEqual(ANALYTICS_DEFAULTS);
    expect(parseAnalyticsSettings(null)).toEqual(ANALYTICS_DEFAULTS);
    expect(parseAnalyticsSettings("x")).toEqual(ANALYTICS_DEFAULTS);
    expect(
      parseAnalyticsSettings({
        inactive_days: "7",
        stuck_days: -3,
        rejections: 0,
      })
    ).toEqual(ANALYTICS_DEFAULTS);
  });

  it("reads a full snake_case row", () => {
    expect(
      parseAnalyticsSettings({
        inactive_days: 5,
        stuck_days: 14,
        rejections: 2,
        low_sentiment: 4,
        missed_reports: 3,
        behind_phases: 2,
        dismiss_days: 14,
      })
    ).toEqual({
      inactiveDays: 5,
      stuckDays: 14,
      rejections: 2,
      lowSentiment: 4,
      missedReports: 3,
      behindPhases: 2,
      dismissDays: 14,
    });
  });

  it("round-trips through toAnalyticsSettingsRow", () => {
    const s = { ...ANALYTICS_DEFAULTS, stuckDays: 21 };
    expect(parseAnalyticsSettings(toAnalyticsSettingsRow(s))).toEqual(s);
  });

  it("has the same defaults as the SQL helper", () => {
    expect(ANALYTICS_DEFAULTS).toEqual({
      inactiveDays: 7,
      stuckDays: 10,
      rejections: 3,
      lowSentiment: 5,
      missedReports: 2,
      behindPhases: 1,
      dismissDays: 7,
    });
  });
});
