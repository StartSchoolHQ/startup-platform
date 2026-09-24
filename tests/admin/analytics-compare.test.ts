import { describe, expect, it } from "vitest";
import { alignBatches } from "@/lib/analytics/compare";
import type { OutcomesBatch } from "@/components/admin/analytics/types";

const week = (
  week: number,
  patch: Partial<OutcomesBatch["weeks"][number]> = {}
) => ({
  week,
  week_start: `2026-01-0${week}`,
  active_pct: 50,
  completions_cum: week,
  completion_pct: 10,
  reports: 3,
  sentiment: 7,
  ...patch,
});

const batch = (name: string, weeks: OutcomesBatch["weeks"]): OutcomesBatch => ({
  id: name,
  name,
  admission_date: "2026-01-01",
  closed_at: null,
  weeks,
  totals: { students: 10, still_active: 9, meetings: 0, mrr: 0, reports: 3 },
});

describe("alignBatches", () => {
  it("merges two batches on programme week, keeping every week from either", () => {
    const rows = alignBatches(
      batch("A", [week(1), week(2, { active_pct: 80 })]),
      batch("B", [week(1, { active_pct: 20 }), week(3)])
    );
    expect(rows.map((r) => r.week)).toEqual([1, 2, 3]);
    expect(rows[0]).toMatchObject({
      week: 1,
      a_active_pct: 50,
      b_active_pct: 20,
    });
    expect(rows[1]).toMatchObject({
      week: 2,
      a_active_pct: 80,
      b_active_pct: null,
    });
    expect(rows[2]).toMatchObject({
      week: 3,
      a_active_pct: null,
      b_active_pct: 50,
    });
  });

  it("works with a single batch", () => {
    const rows = alignBatches(batch("A", [week(1)]), null);
    expect(rows).toHaveLength(1);
    expect(rows[0].b_sentiment).toBeNull();
  });
});
