import { Blend, Briefcase, Code2, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BackgroundLean } from "@/lib/validation-schemas";
import { cn } from "@/lib/utils";

const LEAN: Record<BackgroundLean, { label: string; icon: LucideIcon }> = {
  tech: { label: "Tech", icon: Code2 },
  business: { label: "Business", icon: Briefcase },
  both: { label: "Both", icon: Blend },
};

/**
 * Compact founder-card lean (tech / business / both) for lists such as the
 * leaderboard. `null` = no founder card yet, drawn as a quiet dash so the
 * column keeps its rhythm. The full two-segment track lives in the profile
 * card header; this is its one-glance sibling.
 */
export function LeanBadge({
  lean,
  className,
}: {
  lean: BackgroundLean | null | undefined;
  className?: string;
}) {
  if (!lean) {
    return (
      <span
        className={cn("text-muted-foreground text-sm", className)}
        aria-label="No founder card yet"
      >
        —
      </span>
    );
  }
  const { label, icon: Icon } = LEAN[lean];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", className)}>
      <Icon className="text-primary h-3 w-3" />
      {label}
    </Badge>
  );
}
