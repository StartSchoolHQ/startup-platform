import {
  Blocks,
  BookOpen,
  Compass,
  DoorOpen,
  FlaskConical,
  Hammer,
  Lightbulb,
  Medal,
  Megaphone,
  Presentation,
  Repeat,
  Scale,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * `achievements.icon` holds a lucide icon name (kebab-case, as on
 * lucide.dev). Cards index this map directly — a static lookup, not a
 * component created during render — and fall back to the medal for an
 * unknown or empty name, so a typo in the database never breaks a card.
 */
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  blocks: Blocks,
  "book-open": BookOpen,
  compass: Compass,
  "door-open": DoorOpen,
  "flask-conical": FlaskConical,
  hammer: Hammer,
  lightbulb: Lightbulb,
  medal: Medal,
  megaphone: Megaphone,
  presentation: Presentation,
  repeat: Repeat,
  scale: Scale,
  users: Users,
};

export const DEFAULT_ACHIEVEMENT_ICON: LucideIcon = Medal;

/** Normalises a stored name to a map key ("Door-Open " → "door-open"). */
export function achievementIconKey(name?: string | null): string {
  return (name ?? "").trim().toLowerCase();
}
