import { StatsCard } from "./dashboard"

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  xp: number
  points: number
  date: string
  status: "in-progress" | "finished" | "not-started"
}

export interface Task {
  id: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard"
  xp: number
  points: number
  action: "done" | "complete"
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
    status: string
  }
  statsCards: StatsCard[]
  achievements: Achievement[]
  tasks: Task[]
  weeklyReports: WeeklyReport[]
  strikes: Strike[]
}