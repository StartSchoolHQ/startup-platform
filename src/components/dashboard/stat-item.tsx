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
        backgroundColor="bg-gray-100 dark:bg-gray-800"
      />
      <div className="flex-1 min-w-0">
        <div className="text-lg font-bold">{stat.value}</div>
        <div className="text-sm text-muted-foreground">{stat.label}</div>
      </div>
    </BorderedContainer>
  );
}
