/**
 * Single source of the leaderboard row classes shared by the members, teams
 * and My Journey desktop rows. The rendered string must stay byte-identical to
 * what those rows produced before extraction.
 */
export function leaderboardRowClass({
  highlighted,
  rank,
  minWidthClass = "min-w-[700px]",
}: {
  /** Current user / current user's team — wins over the rank gradients. */
  highlighted?: boolean;
  rank: number;
  minWidthClass?: string;
}): string {
  let baseClass = `grid ${minWidthClass} gap-4 p-4 border-b border-border items-center hover:bg-muted/30 hover:shadow-md transition-all duration-200`;

  if (highlighted) {
    baseClass +=
      " bg-blue-50 dark:bg-blue-950/50 animate-[pulse-subtle_3s_ease-in-out_infinite]";
  } else if (rank === 1) {
    baseClass +=
      " bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-950/20";
  } else if (rank <= 3) {
    baseClass +=
      " bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-900/20";
  }

  return baseClass;
}
