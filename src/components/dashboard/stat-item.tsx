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
          stat.iconColor.includes("orange") || stat.iconColor.includes("yellow")
            ? "bg-accent/20"
            : "bg-primary/10"
        }
      />
      <div>
        <div className="text-lg font-bold">{stat.value}</div>
        <div className="text-sm text-muted-foreground">{stat.label}</div>
      </div>
    </BorderedContainer>
  );
}
