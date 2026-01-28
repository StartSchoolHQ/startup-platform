import { TeamStat, PersonalStat, Activity } from "@/types/dashboard";
import { BorderedContainer } from "./bordered-container";
import { IconContainer } from "./icon-container";
import { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";

// Unified component for all dashboard display items
interface DashboardItemProps {
  stat?:
    | TeamStat
    | PersonalStat
    | { value: string; label: string; icon: LucideIcon; iconColor: string };
  activity?: Activity;
}

function DashboardItem({ stat, activity }: DashboardItemProps) {
  const item = stat || activity;
  if (!item) return null;

  const isActivity = !!activity;
  const rawValue = isActivity ? activity.name : (stat as any).value;
  const label = isActivity ? activity.label : (stat as any).label;
  const icon = item.icon;
  const iconColor = item.iconColor;

  // Animate numeric values with count-up
  const numericValue =
    typeof rawValue === "string" ? parseInt(rawValue.replace(/,/g, ""), 10) : 0;
  const isNumeric = !isNaN(numericValue) && !isActivity;
  const animatedValue = useCountUp(isNumeric ? numericValue : 0, 800);
  const value = isNumeric ? animatedValue.toLocaleString() : rawValue;

  return (
    <BorderedContainer>
      <IconContainer
        icon={icon}
        iconColor={iconColor}
        backgroundColor="bg-gray-100 dark:bg-gray-800"
      />
      <div className={isActivity ? "flex-1" : "flex-1 min-w-0"}>
        <div className="text-lg font-bold">{value}</div>
        {label && (
          <div
            className={
              isActivity
                ? "text-xs text-muted-foreground"
                : "text-sm text-muted-foreground"
            }
          >
            {label}
          </div>
        )}
        {isActivity && activity.indicators && (
          <div className="flex gap-1 mt-1">
            <div className="w-2 h-2 bg-destructive rounded-full"></div>
            <div className="w-2 h-2 bg-destructive rounded-full"></div>
            <div className="w-2 h-2 bg-muted-foreground/30 rounded-full"></div>
            <div className="w-2 h-2 bg-muted-foreground/30 rounded-full"></div>
            <div className="w-2 h-2 bg-muted-foreground/30 rounded-full"></div>
          </div>
        )}
      </div>
    </BorderedContainer>
  );
}

// Export aliases for backward compatibility
export function StatItem({ stat }: { stat: TeamStat | PersonalStat }) {
  return <DashboardItem stat={stat} />;
}

export function TeamItem({
  stat,
}: {
  stat: { value: string; label: string; icon: LucideIcon; iconColor: string };
}) {
  return <DashboardItem stat={stat} />;
}

export function ActivityItem({ activity }: { activity: Activity }) {
  return <DashboardItem activity={activity} />;
}
