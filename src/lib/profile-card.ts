import type { BackgroundLean } from "@/lib/validation-schemas";
import type { ProfileCardFounder } from "@/types/profile-card";

export type FounderCardSectionKey = Exclude<
  keyof ProfileCardFounder,
  "background_lean" | "updated_at"
>;

/** Founder card texts in the same order as the setup form. */
export const FOUNDER_CARD_SECTIONS: {
  key: FounderCardSectionKey;
  label: string;
}[] = [
  { key: "background_reason", label: "In their own words" },
  { key: "bio_energizes", label: "What energizes them" },
  { key: "bio_skills", label: "Skills they bring" },
  { key: "bio_gaps", label: "What a co-founder should cover" },
];

const LEAN_LABELS: Record<BackgroundLean, string> = {
  tech: "Tech",
  business: "Business",
  both: "Tech + Business",
};

export function leanLabel(lean: BackgroundLean | string): string {
  return LEAN_LABELS[lean as BackgroundLean] ?? lean;
}

/** First letters of the first two words; "?" when there is no name. */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/** "Sep 2026" or null for a missing/invalid timestamp. */
export function memberSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
