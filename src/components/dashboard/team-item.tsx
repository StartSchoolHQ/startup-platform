import { Team } from "@/types/dashboard";
import { BorderedContainer } from "./bordered-container";
import { IconContainer } from "./icon-container";

interface TeamItemProps {
  team: Team;
}

export function TeamItem({ team }: TeamItemProps) {
  return (
    <BorderedContainer>
      <IconContainer
        icon={team.icon}
        iconColor={team.iconColor}
        backgroundColor="bg-primary/10"
      />
      <div>
        <div className="text-lg font-bold">{team.name}</div>
        <div className="text-xs text-muted-foreground">{team.label}</div>
      </div>
    </BorderedContainer>
  );
}
