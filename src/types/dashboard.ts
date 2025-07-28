import { LucideIcon } from "lucide-react"

export interface StatsCard {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  iconColor: string
}

export interface TeamStat {
  value: string
  label: string
  icon: LucideIcon
  iconColor: string
}

export interface Team {
  name: string
  label: string
  icon: LucideIcon
  iconColor: string
}

export interface TeamProgressData {
  title: string
  joinTeamsText: string
  stats: TeamStat[]
  teams: Team[]
}

export interface PersonalStat {
  value: string
  label: string
  icon: LucideIcon
  iconColor: string
}

export interface Activity {
  name: string
  icon: LucideIcon
  iconColor: string
  indicators?: string
  label?: string
}

export interface Action {
  text: string
  icon: LucideIcon
  variant?: "default" | "outline"
}

export interface PersonalProgressData {
  title: string
  stats: PersonalStat[]
  activities: Activity[]
  actions: Action[]
} 