import { describe, expect, it } from "vitest";
import {
  ASSISTANT_DEFAULTS,
  parseAssistantSettings,
  toAssistantSettingsRow,
} from "@/lib/assistant/settings";

describe("parseAssistantSettings", () => {
  it("returns the defaults for an empty object", () => {
    expect(parseAssistantSettings({})).toEqual(ASSISTANT_DEFAULTS);
  });

  it("returns the defaults for garbage input", () => {
    expect(parseAssistantSettings(null)).toEqual(ASSISTANT_DEFAULTS);
    expect(parseAssistantSettings("nope")).toEqual(ASSISTANT_DEFAULTS);
    expect(parseAssistantSettings([1, 2])).toEqual(ASSISTANT_DEFAULTS);
    expect(
      parseAssistantSettings({
        enabled: "yes",
        model: 3,
        daily_limit: "25",
        history_turns: null,
        reasoning_effort: 7,
      })
    ).toEqual(ASSISTANT_DEFAULTS);
  });

  it("reads a full snake_case row", () => {
    expect(
      parseAssistantSettings({
        enabled: true,
        model: "gpt-5.4",
        daily_limit: 40,
        history_turns: 6,
        reasoning_effort: "medium",
      })
    ).toEqual({
      enabled: true,
      model: "gpt-5.4",
      dailyLimit: 40,
      historyTurns: 6,
      reasoningEffort: "medium",
    });
  });

  it("falls back to low for an unknown reasoning effort", () => {
    expect(
      parseAssistantSettings({ reasoning_effort: "extreme" }).reasoningEffort
    ).toBe("low");
  });

  it("never returns a daily limit or history below 1", () => {
    expect(parseAssistantSettings({ daily_limit: 0 }).dailyLimit).toBe(25);
    expect(parseAssistantSettings({ daily_limit: -5 }).dailyLimit).toBe(25);
    expect(parseAssistantSettings({ history_turns: 0 }).historyTurns).toBe(10);
  });

  it("round-trips through toAssistantSettingsRow", () => {
    const settings = {
      enabled: true,
      model: "gpt-5.4-mini",
      dailyLimit: 12,
      historyTurns: 4,
      reasoningEffort: "high" as const,
    };
    expect(parseAssistantSettings(toAssistantSettingsRow(settings))).toEqual(
      settings
    );
  });
});
