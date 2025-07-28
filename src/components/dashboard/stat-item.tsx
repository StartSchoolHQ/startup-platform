import { TeamStat, PersonalStat } from "@/types/dashboard"
import { BorderedContainer } from "./bordered-container"
import { IconContainer } from "./icon-container"

interface StatItemProps {
  stat: TeamStat | PersonalStat
}

export function StatItem({ stat }: StatItemProps) {
  return (
    <BorderedContainer>
      <IconContainer 
        icon={stat.icon}
        iconColor={stat.iconColor}
        backgroundColor={stat.iconColor.includes("orange") ? "bg-orange-100" : "bg-purple-100"}
      />
      <div>
        <div className="text-lg font-bold">{stat.value}</div>
        <div className="text-sm text-gray-500">{stat.label}</div>
      </div>
    </BorderedContainer>
  )
} 