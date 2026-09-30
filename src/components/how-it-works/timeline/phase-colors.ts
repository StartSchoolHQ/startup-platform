import type { Phase } from "./timeline-data";

/**
 * Phase colours follow `achievements.color_theme`, in the same soft tint +
 * coloured text the achievement cards use, so the board reads as part of
 * My Journey rather than a separate chart.
 */
export const PHASE_BAR: Record<Phase["number"], string> = {
  1: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  2: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  3: "bg-green-500/10 text-green-700 dark:text-green-300",
  4: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

/** Solid edge on bars and chips; the one saturated touch per phase. */
export const PHASE_EDGE: Record<Phase["number"], string> = {
  1: "border-l-blue-500",
  2: "border-l-orange-500",
  3: "border-l-green-500",
  4: "border-l-rose-500",
};

export const PHASE_DOT: Record<Phase["number"], string> = {
  1: "bg-blue-500",
  2: "bg-orange-500",
  3: "bg-green-500",
  4: "bg-rose-500",
};

export const READING_EDGE = "border-l-indigo-500";
export const READING_DOT = "bg-indigo-500";
export const RECURRING_DOT = "bg-amber-500";
