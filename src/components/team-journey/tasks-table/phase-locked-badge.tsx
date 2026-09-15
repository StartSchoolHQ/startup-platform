import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Status slot for a My Journey task whose phase is still locked. */
export function PhaseLockedBadge() {
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground gap-1 px-2 py-0.5 text-xs font-medium"
    >
      <Lock className="h-3 w-3" />
      Locked
    </Badge>
  );
}
