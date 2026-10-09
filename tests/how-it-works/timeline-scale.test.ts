import { describe, it, expect } from "vitest";
import {
  PX_PER_DAY,
  RANGE_START,
  dayIndex,
  formatRange,
  monthSpans,
  packRows,
  spanWidth,
  weekStarts,
  xOf,
} from "@/components/how-it-works/timeline/timeline-scale";

describe("timeline scale", () => {
  it("counts days from the range start", () => {
    expect(dayIndex(RANGE_START)).toBe(0);
    expect(dayIndex("2026-09-08")).toBe(1);
    expect(dayIndex("2026-10-01")).toBe(24);
  });

  it("maps a date to a pixel offset", () => {
    expect(xOf(RANGE_START)).toBe(0);
    expect(xOf("2026-09-28")).toBe(21 * PX_PER_DAY);
  });

  it("measures an inclusive date span", () => {
    expect(spanWidth("2026-09-28", "2026-09-28")).toBe(PX_PER_DAY);
    expect(spanWidth("2026-09-28", "2026-10-01")).toBe(4 * PX_PER_DAY);
  });

  it("lists every Monday in the range", () => {
    const weeks = weekStarts();
    expect(weeks[0]).toBe("2026-09-07");
    expect(weeks[1]).toBe("2026-09-14");
    expect(weeks.at(-1)).toBe("2027-01-11");
    expect(weeks).toHaveLength(19);
  });

  it("clips the month spans to the range", () => {
    const months = monthSpans();
    expect(months.map((m) => m.label)).toEqual([
      "September",
      "October",
      "November",
      "December",
      "January 2027",
    ]);
    expect(months[0]).toMatchObject({ start: "2026-09-07", end: "2026-09-30" });
    expect(months[3]).toMatchObject({ start: "2026-12-01", end: "2026-12-31" });
    expect(months[4]).toMatchObject({ start: "2027-01-01", end: "2027-01-17" });
  });
});

describe("packRows", () => {
  it("keeps non-overlapping items on the first row", () => {
    const rows = packRows(
      [
        { start: "2026-10-01", end: "2026-10-02" },
        { start: "2026-10-05", end: "2026-10-05" },
      ],
      1
    );
    expect(rows).toEqual([0, 0]);
  });

  it("moves an overlapping item to the next free row", () => {
    const rows = packRows(
      [
        { start: "2026-10-01", end: "2026-10-03" },
        { start: "2026-10-02", end: "2026-10-02" },
        { start: "2026-10-04", end: "2026-10-04" },
      ],
      1
    );
    expect(rows).toEqual([0, 1, 0]);
  });

  it("reserves a minimum width so short items do not collide", () => {
    // Two one-day items two days apart: with a 7-day minimum they overlap.
    const rows = packRows(
      [
        { start: "2026-10-01", end: "2026-10-01" },
        { start: "2026-10-03", end: "2026-10-03" },
      ],
      7
    );
    expect(rows).toEqual([0, 1]);
  });

  it("packs items given out of date order by start date", () => {
    const rows = packRows(
      [
        { start: "2026-10-05", end: "2026-10-05" },
        { start: "2026-10-01", end: "2026-10-06" },
      ],
      1
    );
    expect(rows).toEqual([1, 0]);
  });
});

describe("formatRange", () => {
  it("collapses a single day and drops the month when it repeats", () => {
    expect(formatRange("2026-10-05", "2026-10-05")).toBe("Oct 5");
    expect(formatRange("2026-10-05", "2026-10-12")).toBe("Oct 5–12");
    expect(formatRange("2026-10-31", "2026-11-01")).toBe("Oct 31–Nov 1");
  });
});
