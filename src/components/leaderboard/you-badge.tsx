import { Badge } from "@/components/ui/badge";

/** "You" / "Your team" marker on the viewer's own leaderboard row. */
export function YouBadge({ label = "You" }: { label?: string }) {
  return (
    <Badge
      variant="outline"
      className="border-primary/30 bg-primary/10 text-primary px-1.5 py-0 text-[10px] font-semibold"
    >
      {label}
    </Badge>
  );
}
