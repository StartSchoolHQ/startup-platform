/**
 * Single source of truth for the two economies' student-facing unit labels.
 *
 * My Journey (solo phase) earns "My Journey XP" + "Credits".
 * Team Journey (startup phase) earns "Team XP" + "Team Points".
 *
 * Students must never see a bare "XP" / "Points" — always route the label
 * through here so a wording change stays a one-line edit.
 */

export type Economy = "my_journey" | "team";

export interface EconomyLabels {
  xp: string;
  points: string;
}

const LABELS: Record<Economy, EconomyLabels> = {
  my_journey: { xp: "My Journey XP", points: "Credits" },
  team: { xp: "Team XP", points: "Team Points" },
};

export function economyLabels(economy: Economy): EconomyLabels {
  return LABELS[economy];
}

/**
 * Maps a `transactions.activity_type` / `tasks.activity_type` value to its
 * economy. Only `"individual"` is booked against My Journey; everything else
 * (including an unknown or missing value) belongs to the Team economy.
 */
export function economyFromActivityType(activityType: string | null): Economy {
  return activityType === "individual" ? "my_journey" : "team";
}
