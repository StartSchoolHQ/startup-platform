import { describe, expect, it } from "vitest";
import { formatResetTime, nextUtcMidnight } from "@/lib/assistant/limits";

describe("nextUtcMidnight", () => {
  it("returns the coming 00:00 UTC", () => {
    const at = new Date("2026-09-24T13:00:00Z");
    expect(nextUtcMidnight(at).toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });

  it("rolls to the next day when called exactly at midnight", () => {
    const at = new Date("2026-09-25T00:00:00Z");
    expect(nextUtcMidnight(at).toISOString()).toBe("2026-09-26T00:00:00.000Z");
  });

  it("crosses month and year boundaries", () => {
    const at = new Date("2026-12-31T23:59:59Z");
    expect(nextUtcMidnight(at).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("formatResetTime", () => {
  it("names midnight UTC and the viewer's local time", () => {
    const reset = new Date("2026-09-25T00:00:00Z");
    const text = formatResetTime(reset, "Europe/Riga");
    expect(text).toBe("00:00 UTC (03:00 your time)");
  });

  it("omits the local part when the viewer is on UTC", () => {
    const reset = new Date("2026-09-25T00:00:00Z");
    expect(formatResetTime(reset, "UTC")).toBe("00:00 UTC");
  });
});

describe("startOfUtcDay", () => {
  it("returns 00:00 UTC of the given instant's day", async () => {
    const { startOfUtcDay } = await import("@/lib/assistant/limits");
    expect(startOfUtcDay(new Date("2026-09-24T23:59:59Z")).toISOString()).toBe(
      "2026-09-24T00:00:00.000Z"
    );
  });
});
