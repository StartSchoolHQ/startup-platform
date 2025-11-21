import { Team } from "@/types/dashboard";
import { BorderedContainer } from "./bordered-container";
import { IconContainer } from "./icon-container";
import { Star, Trophy, Users, LucideIcon } from "lucide-react";

interface TeamItemProps {
  team: Team;
  stat: {
    value: string;
    label: string;
    icon: LucideIcon;
    iconColor: string;
  };
}

export function TeamItem({ team, stat }: TeamItemProps) {
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
