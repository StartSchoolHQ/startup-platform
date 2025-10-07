import { TeamStat, PersonalStat } from "@/types/dashboard";
import { BorderedContainer } from "./bordered-container";
import { IconContainer } from "./icon-container";

interface StatItemProps {
  stat: TeamStat | PersonalStat;
}

export function StatItem({ stat }: StatItemProps) {
  return (
    <BorderedContainer>
      <IconContainer
        icon={stat.icon}
        iconColor={stat.iconColor}
        backgroundColor={
          stat.iconColor.includes("orange")
            ? "bg-orange-100 dark:bg-orange-950/20"
            : "bg-purple-100 dark:bg-purple-950/20"
        }
      />
      <div>
        <div className="text-lg font-bold">{stat.value}</div>
        <div className="text-sm text-muted-foreground">{stat.label}</div>
      </div>
    </BorderedContainer>
  );
}
