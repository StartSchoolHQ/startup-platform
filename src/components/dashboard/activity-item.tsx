import { Activity } from "@/types/dashboard";
import { BorderedContainer } from "./bordered-container";
import { IconContainer } from "./icon-container";

interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const getBackgroundColor = (iconColor: string) => {
    if (iconColor.includes("red")) return "bg-red-100 dark:bg-red-950/20";
    if (iconColor.includes("pink")) return "bg-pink-100 dark:bg-pink-950/20";
    return "bg-muted";
  };

  return (
    <BorderedContainer>
      <IconContainer
        icon={activity.icon}
        iconColor={activity.iconColor}
        backgroundColor={getBackgroundColor(activity.iconColor)}
      />
      <div className="flex-1">
        <div className="text-lg font-bold">{activity.name}</div>
        {activity.label && (
          <div className="text-xs text-muted-foreground">{activity.label}</div>
        )}
        {activity.indicators && (
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
