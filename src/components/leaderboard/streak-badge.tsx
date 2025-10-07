interface StreakBadgeProps {
  days: number;
  type: "active" | "warning" | "inactive";
}

export function StreakBadge({ days, type }: StreakBadgeProps) {
  const getBadgeColor = () => {
    switch (type) {
      case "active":
        return "bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400";
      case "warning":
        return "bg-orange-100 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400";
      case "inactive":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${getBadgeColor()}`}
    >
      {days} days
    </span>
  );
}
