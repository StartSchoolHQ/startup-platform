import { Trophy, Star, Target, CheckSquare, Shield, Clock, Users, User } from "lucide-react"
import { MyJourneyData } from "@/types/my-journey"

export const myJourneyData: MyJourneyData = {
  user: {
    name: "Davids Petruhovs",
    status: "Active"
  },
  statsCards: [
    {
      title: "Achievements",
      value: "8/25",
      subtitle: "+19% from last week",
      icon: Trophy,
      iconColor: "text-yellow-500"
    },
    {
      title: "Tasks",
      value: "32/150",
      subtitle: "+13% from last week",
      icon: CheckSquare,
      iconColor: "text-green-500"
    },
    {
      title: "XP Earned",
      value: "9504",
      subtitle: "+301 since last week",
      icon: Target,
      iconColor: "text-purple-500"
    },
    {
      title: "Points Earned",
      value: "9504",
      subtitle: "+301 since last week",
      icon: Star,
      iconColor: "text-orange-500"
    }
  ],
  achievements: [
    {
      id: "1",
      title: "Build in Public",
      description: "Click to unifier",
      status: "in-progress",
      points: 680,
      xp: 1020,
      progress: 75,
      clickText: "Click to filter"
    },
    {
      id: "2",
      title: "Topic 2",
      description: "Click to filter",
      status: "finished",
      points: 680,
      xp: 1020,
      clickText: "Click to filter"
    },
    {
      id: "3",
      title: "Topic 3",
      description: "Click to filter",
      status: "not-started",
      points: 680,
      xp: 1020,
      clickText: "Click to filter"
    },
    {
      id: "4",
      title: "Topic 4",
      description: "Click to filter",
      status: "not-started",
      points: 680,
      xp: 1020,
      clickText: "Click to filter"
    },
    {
      id: "5",
      title: "Topic 5",
      description: "Click to filter",
      status: "not-started",
      points: 680,
      xp: 1020,
      clickText: "Click to filter"
    },
    {
      id: "6",
      title: "Topic 6",
      description: "Click to filter",
      status: "not-started",
      points: 680,
      xp: 1000,
      clickText: "Click to filter"
    },
    {
      id: "7",
      title: "Topic 7",
      description: "Click to filter",
      status: "not-started",
      points: 680,
      xp: 1020,
      clickText: "Click to filter"
    },
    {
      id: "8",
      title: "Topic 8",
      description: "Click to filter",
      status: "not-started",
      points: 680,
      xp: 1020,
      clickText: "Click to filter"
    }
  ],
  tasks: [
    {
      id: "1",
      title: "Tweet 5 posts a day for a Week",
      description: "Launch Achievements",
      difficulty: "easy",
      xp: 50,
      points: 25,
      action: "complete",
      tips: true
    },
    {
      id: "2", 
      title: "Random Task",
      description: "Launch Achievements",
      difficulty: "medium",
      xp: 50,
      points: 25,
      action: "done",
      tips: false
    },
    {
      id: "3",
      title: "Random Task", 
      description: "Launch Achievements",
      difficulty: "hard",
      xp: 50,
      points: 25,
      action: "complete",
      tips: true
    },
    {
      id: "4",
      title: "Random Task",
      description: "Launch Achievements", 
      difficulty: "easy",
      xp: 50,
      points: 25,
      action: "complete",
      tips: true
    },
    {
      id: "5",
      title: "Random Task",
      description: "Launch Achievements",
      difficulty: "easy", 
      xp: 50,
      points: 25,
      action: "complete",
      tips: true
    }
  ],
  weeklyReports: [
    {
      id: "1",
      week: "Week 4",
      dateRange: "01.05-07.05",
      status: "complete",
      dateFilled: "XX.XX.XXXX XX:XX",
      weeklyFill: "Week 4 Fill",
      iconColor: "green"
    },
    {
      id: "2",
      week: "Week 3",
      dateRange: "01.05-07.05",
      status: "done",
      dateFilled: "XX.XX.XXXX XX:XX",
      weeklyFill: "Week 3 Fill",
      iconColor: "green"
    },
    {
      id: "3",
      week: "Week 2",
      dateRange: "01.05-07.05",
      status: "missed",
      dateFilled: "XX.XX.XXXX XX:XX",
      weeklyFill: "Week 2 Fill",
      iconColor: "red"
    },
    {
      id: "4",
      week: "Week 1",
      dateRange: "01.05-07.05",
      status: "done",
      dateFilled: "XX.XX.XXXX XX:XX",
      weeklyFill: "Week 1 Fill",
      iconColor: "green"
    },
    {
      id: "5",
      week: "Week 0",
      dateRange: "01.05-07.05",
      status: "done",
      dateFilled: "XX.XX.XXXX XX:XX",
      weeklyFill: "Week 0 Fill",
      iconColor: "green"
    }
  ],
  strikes: [
    {
      id: "1",
      title: "Missed Weekly Meeting Submission",
      date: "2025-07-15 10:00 AM",
      status: "explained",
      xpPenalty: 500,
      pointsPenalty: 250,
      action: "done"
    },
    {
      id: "2",
      title: "Missed Weekly Minimum Meetings",
      date: "2025-07-15 10:00 AM",
      status: "waiting-explanation",
      xpPenalty: 250,
      pointsPenalty: 125,
      action: "explain"
    }
  ]
}