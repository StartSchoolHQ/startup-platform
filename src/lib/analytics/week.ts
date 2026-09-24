import { format } from "date-fns";

const DAY_MS = 86_400_000;

/**
 * Programme week, 1-based, counted from the batch's admission date. Matches
 * `_analytics_week_v1` in SQL: floor(days / 7) + 1, never below 1.
 */
export function programmeWeek(date: Date, admission: Date): number {
  const days = Math.floor((date.getTime() - admission.getTime()) / DAY_MS);
  return Math.max(1, Math.floor(days / 7) + 1);
}

/** "Week 3" or "Week 3 · 15 Sep" when the start date is known. */
export function weekLabel(week: number, weekStart?: string | null): string {
  const base = `Week ${week}`;
  if (!weekStart) return base;
  return `${base} · ${format(new Date(weekStart), "d MMM")}`;
}
