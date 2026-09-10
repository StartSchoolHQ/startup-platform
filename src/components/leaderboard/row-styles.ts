/**
 * Single source of the leaderboard row classes shared by the members, teams
 * and My Journey desktop rows.
 *
 * Your own row (or your team's) gets a primary tint plus a left accent; the
 * #1 row gets a faint gold wash. Everything else stays neutral so the rank
 * icons do the talking.
 */
export function leaderboardRowClass({
  highlighted,
  rank,
  minWidthClass = "min-w-[700px]",
}: {
  /** Current user / current user's team — wins over the rank tint. */
  highlighted?: boolean;
  rank: number;
  minWidthClass?: string;
}): string {
  let baseClass = `grid ${minWidthClass} gap-4 p-4 border-b border-border items-center hover:bg-muted/40 transition-colors border-l-2 border-l-transparent`;

  if (highlighted) {
    baseClass += " bg-primary/5 border-l-primary";
  } else if (rank === 1) {
    baseClass += " bg-amber-500/[0.06]";
  }

  return baseClass;
}
