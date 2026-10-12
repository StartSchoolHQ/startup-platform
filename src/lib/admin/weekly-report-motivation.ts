/**
 * Motivation summary for the admin Weekly Reports page: the average
 * `alignmentScore` of last week's submitted solo reports. Pure helpers;
 * the route fetches the rows, the card formats the result.
 *
 * Weeks are Monday–Sunday in UTC, matching `weekly_reports.week_start_date`
 * and the analytics pulse RPC's `date_trunc('week', now()) - 7`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function mondayOf(date: Date): number {
  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  return utc - sinceMonday * DAY_MS;
}

/** Monday of the last complete week before `now`, as `YYYY-MM-DD`. */
export function lastFullWeekStart(now: Date = new Date()): string {
  return toIso(mondayOf(now) - 7 * DAY_MS);
}

/** Sunday of the week that starts on `weekStart`. */
export function weekEnd(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  return toIso(Date.UTC(y, m - 1, d) + 6 * DAY_MS);
}

/** The 1–10 score inside `submission_data`, or null when absent/invalid. */
export function motivationScore(submissionData: unknown): number | null {
  if (!submissionData || typeof submissionData !== "object") return null;
  const raw = (submissionData as { alignmentScore?: unknown }).alignmentScore;
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && /^\d+$/.test(raw)
        ? Number(raw)
        : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
}

export interface MotivationSummary {
  /** Mean score to one decimal; null when no scored report exists. */
  average: number | null;
  /** Scored reports in the week. */
  count: number;
  /** Change versus the week before; null when either week is empty. */
  delta: number | null;
}

function mean(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

export function motivationSummary(
  week: (number | null)[],
  weekBefore: (number | null)[]
): MotivationSummary {
  const average = mean(week);
  const previous = mean(weekBefore);
  return {
    average,
    count: week.filter((s) => s !== null).length,
    delta:
      average === null || previous === null
        ? null
        : Math.round((average - previous) * 10) / 10,
  };
}
