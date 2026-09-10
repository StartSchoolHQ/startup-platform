import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Shared header for the My Journey dashboard cards: primary-tinted icon tile,
 * title, and an optional right-aligned aside (a count, a category).
 */
export function CardTitleRow({
  icon: Icon,
  title,
  aside,
}: {
  icon: LucideIcon;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
          <Icon className="h-4 w-4" />
        </div>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </div>
      {aside && (
        <div className="text-muted-foreground shrink-0 text-xs">{aside}</div>
      )}
    </CardHeader>
  );
}
