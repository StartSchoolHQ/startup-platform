import { Trophy, Star, Target, CheckSquare, Users, User, AlertTriangle, FileText } from "lucide-react"
import { StatsCard, TeamProgressData, PersonalProgressData } from "@/types/dashboard"

// Mock data for the stats cards with exact values from screenshot
export const statsCards: StatsCard[] = [
  {
    title: "XP Earned",
    value: "9504",
    subtitle: "+301 since last week",
    icon: Trophy,
    iconColor: "text-purple-500"
  },
  {
    title: "Points Earned", 
    value: "9504",
    subtitle: "+301 since last week",
    icon: Star,
    iconColor: "text-orange-500"
  },
  {
    title: "Achievements",
    value: "8/25",
    subtitle: "+1 this from last week",
    icon: Target,
    iconColor: "text-yellow-500"
  },
  {
    title: "Tasks",
    value: "32/150", 
    subtitle: "+6 this from last week",
    icon: CheckSquare,
    iconColor: "text-green-500"
  }
]

// Mock data for team progress
export const teamProgressData: TeamProgressData = {
  title: "Your Teams Progress",
  joinTeamsText: "Join Teams",
  stats: [
    {
      value: "24040",
      label: "Total Points Earned",
      icon: Star,
      iconColor: "text-orange-500"
    },
    {
      value: "42000", 
      label: "Total XP Earned",
      icon: Trophy,
      iconColor: "text-purple-500"
    }
  ],
  teams: [
    {
      name: "suppdocs",
      label: "Team Lead",
      icon: Users,
      iconColor: "text-blue-500"
    },
    {
      name: "suppdocs",
      label: "Team Lead", 
      icon: Users,
      iconColor: "text-blue-500"
    },
    {
      name: "suppdocs",
      label: "Team Lead",
      icon: Users,
      iconColor: "text-blue-500"
    },
    {
      name: "suppdocs",
      label: "Team Lead",
      icon: Users,
      iconColor: "text-blue-500"
    }
  ]
}

// Mock data for personal progress
export const personalProgressData: PersonalProgressData = {
  title: "Your Personal Progress",
  stats: [
    {
      value: "24040",
      label: "Total Points Earned",
      icon: Star,
      iconColor: "text-orange-500"
    },
    {
      value: "42000",
      label: "Total XP Earned", 
      icon: Trophy,
      iconColor: "text-purple-500"
    }
  ],
  activities: [
    {
      name: "Strikes",
      icon: AlertTriangle,
      iconColor: "text-red-500",
      indicators: "••"
    },
    {
      name: "30 Tests",
      label: "How Much Tests Done",
      icon: FileText,
      iconColor: "text-pink-500"
    }
  ],
  actions: [
    {
      text: "Submit Weekly Report",
      icon: FileText,
      variant: "outline"
    },
    {
      text: "View Progress",
      icon: FileText,
      variant: "default"
    }
  ]
} 