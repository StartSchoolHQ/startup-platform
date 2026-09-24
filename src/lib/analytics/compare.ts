import type { OutcomesBatch } from "@/components/admin/analytics/types";

type Week = OutcomesBatch["weeks"][number];

export interface AlignedWeek {
  week: number;
  a_active_pct: number | null;
  b_active_pct: number | null;
  a_completion_pct: number | null;
  b_completion_pct: number | null;
  a_sentiment: number | null;
  b_sentiment: number | null;
  a_reports: number | null;
  b_reports: number | null;
}

/**
 * Merges two batches' week series on programme week so week 3 of Batch 3 sits
 * next to week 3 of Batch 2 regardless of calendar dates. Missing weeks on
 * either side are null, never zero, so lines break instead of dipping.
 */
export function alignBatches(
  a: Pick<OutcomesBatch, "weeks"> | null,
  b: Pick<OutcomesBatch, "weeks"> | null
): AlignedWeek[] {
  const byWeek = new Map<number, { a?: Week; b?: Week }>();
  for (const w of a?.weeks ?? [])
    byWeek.set(w.week, { ...byWeek.get(w.week), a: w });
  for (const w of b?.weeks ?? [])
    byWeek.set(w.week, { ...byWeek.get(w.week), b: w });
  return [...byWeek.entries()]
    .sort(([x], [y]) => x - y)
    .map(([week, { a, b }]) => ({
      week,
      a_active_pct: a?.active_pct ?? null,
      b_active_pct: b?.active_pct ?? null,
      a_completion_pct: a?.completion_pct ?? null,
      b_completion_pct: b?.completion_pct ?? null,
      a_sentiment: a?.sentiment ?? null,
      b_sentiment: b?.sentiment ?? null,
      a_reports: a?.reports ?? null,
      b_reports: b?.reports ?? null,
    }));
}
