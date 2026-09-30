/**
 * Day scale for the programme timeline board. Dates are ISO `YYYY-MM-DD`
 * strings and the maths is done in UTC so the board looks the same in
 * every timezone. Pure functions, no DOM.
 */

/** First Monday shown on the ruler. */
export const RANGE_START = "2026-09-07";
/** Last day shown, inclusive. */
export const RANGE_END = "2026-12-31";
export const PX_PER_DAY = 18;

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole days between the range start and `iso` (negative before it). */
export function dayIndex(iso: string): number {
  return Math.round((toUtc(iso) - toUtc(RANGE_START)) / DAY_MS);
}

export function xOf(iso: string): number {
  return dayIndex(iso) * PX_PER_DAY;
}

/** Width of an inclusive `start`..`end` span. */
export function spanWidth(start: string, end: string): number {
  return (dayIndex(end) - dayIndex(start) + 1) * PX_PER_DAY;
}

/** Total width of the board. */
export function boardWidth(): number {
  return spanWidth(RANGE_START, RANGE_END);
}

/** Every Monday from the range start to the end, as ISO dates. */
export function weekStarts(): string[] {
  const out: string[] = [];
  const end = toUtc(RANGE_END);
  for (let t = toUtc(RANGE_START); t <= end; t += 7 * DAY_MS) {
    out.push(toIso(t));
  }
  return out;
}

export interface MonthSpan {
  label: string;
  start: string;
  end: string;
}

/** Calendar months overlapping the range, clipped to it. */
export function monthSpans(): MonthSpan[] {
  const out: MonthSpan[] = [];
  const first = new Date(toUtc(RANGE_START));
  let y = first.getUTCFullYear();
  let m = first.getUTCMonth();
  const rangeEnd = toUtc(RANGE_END);
  while (Date.UTC(y, m, 1) <= rangeEnd) {
    const monthStart = Date.UTC(y, m, 1);
    const monthEnd = Date.UTC(y, m + 1, 0);
    out.push({
      label: new Date(monthStart).toLocaleString("en-GB", {
        month: "long",
        timeZone: "UTC",
      }),
      start: toIso(Math.max(monthStart, toUtc(RANGE_START))),
      end: toIso(Math.min(monthEnd, rangeEnd)),
    });
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

export interface DateSpan {
  start: string;
  end: string;
}

/**
 * Greedy row packing: each item goes on the first row where it does not
 * overlap anything already placed. `minDays` widens every item so short
 * ones still leave room for their label. Returns the row index per input
 * position; placement runs in start-date order regardless of input order.
 */
export function packRows(items: DateSpan[], minDays: number): number[] {
  const order = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => dayIndex(a.item.start) - dayIndex(b.item.start));
  const rowEnds: number[] = [];
  const rows = new Array<number>(items.length);

  for (const { item, index } of order) {
    const start = dayIndex(item.start);
    const end = Math.max(dayIndex(item.end), start + minDays - 1);
    let row = rowEnds.findIndex((rowEnd) => rowEnd < start);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(end);
    } else {
      rowEnds[row] = end;
    }
    rows[index] = row;
  }
  return rows;
}

/** "15 min" under an hour, "1.5h" from an hour up. */
export function formatEffort(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours}h`;
}

function shortDate(iso: string, withMonth: boolean): string {
  const d = new Date(toUtc(iso));
  const day = d.getUTCDate();
  if (!withMonth) return String(day);
  const month = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  return `${month} ${day}`;
}

/** "Oct 5", "Oct 5–12" or "Oct 31–Nov 1". */
export function formatRange(start: string, end: string): string {
  if (start === end) return shortDate(start, true);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${shortDate(start, true)}\u2013${shortDate(end, !sameMonth)}`;
}
