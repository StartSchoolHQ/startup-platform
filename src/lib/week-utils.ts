/**
 * Calculate ISO 8601 week boundaries (Monday-Sunday) for a given week number and year.
 *
 * ISO week 1 is defined as the week containing January 4th.
 * Weeks always start on Monday and end on Sunday.
 *
 * The naive approach of `new Date(year, 0, 1) + (weekNumber - 1) * 7` is WRONG
 * because January 1st can fall on any day of the week. This function anchors
 * on January 4th to find the Monday of ISO week 1, then offsets from there.
 */
export function getISOWeekBoundaries(
  weekYear: number,
  weekNumber: number
): { weekStart: Date; weekEnd: Date } {
  // January 4th is always in ISO week 1
  const jan4 = new Date(weekYear, 0, 4);
  // getDay() returns 0 for Sunday; convert to ISO day (Monday=1 ... Sunday=7)
  const dayOfWeek = jan4.getDay() || 7;
  // Monday of ISO week 1
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  // Monday of the target week
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  // Sunday of the target week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return { weekStart, weekEnd };
}
