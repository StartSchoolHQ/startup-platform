import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Quiet label row used by the V2 My Journey dashboard cards: small icon +
 * muted title on the left, optional aside on the right. Keeps the chrome
 * light so the card's content carries the weight.
 */
export function SectionLabel({
  icon: Icon,
  title,
  aside,
}: {
  icon: LucideIcon;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
        <Icon className="text-primary h-4 w-4" />
        {title}
      </div>
      {aside && (
        <div className="text-muted-foreground shrink-0 text-xs">{aside}</div>
      )}
    </div>
  );
}
