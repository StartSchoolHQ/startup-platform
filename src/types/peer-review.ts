import { LucideIcon } from "lucide-react"
import { StatsCard } from "./dashboard"

export interface TestTask {
  id: string
  title: string
  description: string
  submittedBy: {
    name: string
    avatar: string
    date: string
  }
  difficulty: "easy" | "medium" | "hard"
  xp: number
  points: number
  action: "test" | "done" | "review"
  tips?: boolean
}

export interface MyTest {
  id: string
  title: string
  description: string
  testedBy: {
    name: string
    avatar: string
    date: string
  }
  difficulty: "easy" | "medium" | "hard"
  xp: number
  points: number
  status: "pending" | "approved" | "rejected"
  action: "view" | "resubmit"
}

export interface MyTask {
  id: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard"
  xp: number
  points: number
  status: "accepted" | "in-progress" | "denied"
  testedBy?: {
    name: string
    avatar: string
    date: string
  }
  action: "edit" | "view" | "resubmit"
}

// Using the existing StatsCard interface from dashboard types
export interface PeerReviewData {
  statsCards: StatsCard[]
  availableTests: TestTask[]
  myTests: MyTest[]
  myTasks: MyTask[]
}