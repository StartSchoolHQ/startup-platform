interface StreakBadgeProps {
  days: number;
  type: "active" | "warning" | "inactive";
}

export function StreakBadge({ days, type }: StreakBadgeProps) {
  const getBadgeColor = () => {
    switch (type) {
      case "active":
        return "bg-primary/10 text-primary";
      case "warning":
        return "bg-accent/20 text-accent-foreground";
      case "inactive":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <span
      className={`rounded px-2 py-1 text-xs font-medium ${getBadgeColor()}`}
    >
      {days} {days === 1 ? "week" : "weeks"}
    </span>
  );
}
