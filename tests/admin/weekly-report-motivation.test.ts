import { describe, it, expect } from "vitest";
import {
  lastFullWeekStart,
  motivationScore,
  motivationSummary,
  weekEnd,
} from "@/lib/admin/weekly-report-motivation";

describe("lastFullWeekStart", () => {
  it("returns the Monday of the previous week, UTC", () => {
    // Monday 12 Oct 2026 → last full week is 5–11 Oct
    expect(lastFullWeekStart(new Date("2026-10-12T08:00:00Z"))).toBe(
      "2026-10-05"
    );
    // Sunday 11 Oct still belongs to the week of 5 Oct → previous is 28 Sep
    expect(lastFullWeekStart(new Date("2026-10-11T23:59:00Z"))).toBe(
      "2026-09-28"
    );
    // Wednesday mid-week
    expect(lastFullWeekStart(new Date("2026-10-14T12:00:00Z"))).toBe(
      "2026-10-05"
    );
  });

  it("weekEnd is the Sunday of that week", () => {
    expect(weekEnd("2026-10-05")).toBe("2026-10-11");
  });
});

describe("motivationScore", () => {
  it("reads an integer 1–10 from submission_data", () => {
    expect(motivationScore({ alignmentScore: 7 })).toBe(7);
    expect(motivationScore({ alignmentScore: "8" })).toBe(8);
  });

  it("returns null for missing, blank, or out-of-range values", () => {
    expect(motivationScore(null)).toBeNull();
    expect(motivationScore({})).toBeNull();
    expect(motivationScore({ alignmentScore: null })).toBeNull();
    expect(motivationScore({ alignmentScore: 0 })).toBeNull();
    expect(motivationScore({ alignmentScore: 11 })).toBeNull();
    expect(motivationScore({ alignmentScore: "abc" })).toBeNull();
    expect(motivationScore("nope")).toBeNull();
  });
});

describe("motivationSummary", () => {
  it("averages to one decimal and counts the scored reports", () => {
    const s = motivationSummary([7, 8, 10, 2], [8, 9]);
    expect(s).toEqual({ average: 6.8, count: 4, delta: -1.7 });
  });

  it("ignores nulls in both weeks", () => {
    const s = motivationSummary([7, null, 9], [null]);
    expect(s).toEqual({ average: 8, count: 2, delta: null });
  });

  it("is empty when nobody reported", () => {
    expect(motivationSummary([], [7])).toEqual({
      average: null,
      count: 0,
      delta: null,
    });
  });
});
