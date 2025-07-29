import { LucideIcon } from "lucide-react"

export interface MyJourneyStatsCard {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  iconColor: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  status: "in-progress" | "finished" | "not-started"
  points: number
  xp: number
  progress?: number
  clickText: string
}

export interface Task {
  id: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard"
  xp: number
  points: number
  action: "complete" | "done"
  tips: boolean
}

export interface WeeklyReport {
  id: string
  week: string
  dateRange: string
  status: "complete" | "done" | "missed"
  dateFilled: string
  weeklyFill: string
  iconColor: "green" | "red"
}

export interface Strike {
  id: string
  title: string
  date: string
  status: "explained" | "waiting-explanation"
  xpPenalty: number
  pointsPenalty: number
  action: "done" | "explain"
}

export interface MyJourneyData {
  user: {
    name: string
    status: "Active" | "Inactive"
  }
  statsCards: MyJourneyStatsCard[]
  achievements: Achievement[]
  tasks: Task[]
  weeklyReports: WeeklyReport[]
  strikes: Strike[]
}