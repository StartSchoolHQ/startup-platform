import { describe, expect, it } from "vitest";
import { programmeWeek, weekLabel } from "@/lib/analytics/week";

const admission = new Date("2026-09-01T00:00:00Z");

describe("programmeWeek", () => {
  it("is 1 on the admission day and 2 a week later", () => {
    expect(programmeWeek(new Date("2026-09-01T12:00:00Z"), admission)).toBe(1);
    expect(programmeWeek(new Date("2026-09-07T23:00:00Z"), admission)).toBe(1);
    expect(programmeWeek(new Date("2026-09-08T00:00:00Z"), admission)).toBe(2);
  });

  it("never goes below 1", () => {
    expect(programmeWeek(new Date("2026-08-20T00:00:00Z"), admission)).toBe(1);
  });

  it("matches the SQL formula floor(days / 7) + 1", () => {
    expect(programmeWeek(new Date("2026-12-31T00:00:00Z"), admission)).toBe(
      Math.floor(121 / 7) + 1
    );
  });
});

describe("weekLabel", () => {
  it("names the week and, when given, its start date", () => {
    expect(weekLabel(3)).toBe("Week 3");
    expect(weekLabel(3, "2026-09-15")).toBe("Week 3 · 15 Sep");
  });
});
