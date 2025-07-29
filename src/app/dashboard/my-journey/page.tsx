"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  Star,
  Target,
  CheckSquare,
  Settings,
  FileText,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Shield,
  CheckCircle,
  Clock,
  Zap,
  CreditCard,
  Banknote,
  Medal,
} from "lucide-react";
import { myJourneyData } from "@/data/my-journey-data";
import { Task, WeeklyReport, Strike } from "@/types/my-journey";
import { AchievementCard } from "@/components/my-journey/achievement-card";
import { StatsCardComponent } from "@/components/dashboard/stats-card";

// Task row component
function TaskRow({ task }: { task: Task }) {
  const getDifficultyConfig = (difficulty: Task["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return {
          badgeText: "Easy",
          badgeClass: "bg-green-100 text-green-800",
        };
      case "medium":
        return {
          badgeText: "Medium",
          badgeClass: "bg-yellow-100 text-yellow-800",
        };
      case "hard":
        return {
          badgeText: "Hard",
          badgeClass: "bg-red-100 text-red-800",
        };
    }
  };

  const getActionConfig = (action: Task["action"]) => {
    switch (action) {
      case "done":
        return {
          buttonText: "Done",
          buttonClass: "bg-green-600 text-white hover:bg-green-700",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "complete":
        return {
          buttonText: "Complete",
          buttonClass:
            "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
    }
  };

  const difficultyConfig = getDifficultyConfig(task.difficulty);
  const actionConfig = getActionConfig(task.action);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-md ${
              task.action === "done" ? "bg-green-100" : "bg-gray-100"
            }`}
          >
            <Medal className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-sm">{task.title}</div>
            <div className="text-xs text-muted-foreground">
              {task.description}
            </div>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <Badge variant="secondary" className={difficultyConfig.badgeClass}>
          {difficultyConfig.badgeText}
        </Badge>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-1">
          <Zap className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">{task.xp}</span>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-1">
          <Banknote className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">{task.points}</span>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex justify-end">
          <Button size="sm" className={`h-8  ${actionConfig.buttonClass}`}>
            {actionConfig.icon}
            {actionConfig.buttonText}
          </Button>
        </div>
      </td>
    </tr>
  );
}

// Weekly report row component
function WeeklyReportRow({ report }: { report: WeeklyReport }) {
  const getActionConfig = (status: WeeklyReport["status"]) => {
    switch (status) {
      case "complete":
        return {
          buttonText: "Complete",
          buttonClass:
            "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
      case "done":
        return {
          buttonText: "Done",
          buttonClass: "bg-green-600 text-white hover:bg-green-700",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "missed":
        return {
          buttonText: "Missed",
          buttonClass: "bg-red-600 text-white hover:bg-red-700",
          icon: <AlertTriangle className="h-3 w-3 mr-1" />,
        };
    }
  };

  const actionConfig = getActionConfig(report.status);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
            W
          </div>
          <div>
            <div className="font-medium text-sm">{report.week}</div>
            <div className="text-xs text-muted-foreground">
              {report.dateRange}
            </div>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="text-sm text-muted-foreground">{report.dateFilled}</div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <Calendar
            className={`h-4 w-4 ${
              report.iconColor === "green" ? "text-green-500" : "text-red-500"
            }`}
          />
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex justify-end">
          <Button size="sm" className={`h-8  ${actionConfig.buttonClass}`}>
            {actionConfig.icon}
            {actionConfig.buttonText}
          </Button>
        </div>
      </td>
    </tr>
  );
}

// Strike row component
function StrikeRow({ strike }: { strike: Strike }) {
  const getStatusConfig = (status: Strike["status"]) => {
    switch (status) {
      case "explained":
        return {
          badgeText: "Explained",
          badgeClass: "bg-green-100 text-green-800",
        };
      case "waiting-explanation":
        return {
          badgeText: "Waiting on Explanation",
          badgeClass: "bg-red-100 text-red-800",
        };
    }
  };

  const getActionConfig = (action: Strike["action"]) => {
    switch (action) {
      case "done":
        return {
          buttonText: "Done",
          buttonClass: "bg-green-600 text-white hover:bg-green-700",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "explain":
        return {
          buttonText: "Explain",
          buttonClass:
            "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
    }
  };

  const statusConfig = getStatusConfig(strike.status);
  const actionConfig = getActionConfig(strike.action);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-100">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <div className="font-medium text-sm">{strike.title}</div>
            <div className="text-xs text-muted-foreground">{strike.date}</div>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <Badge variant="secondary" className={statusConfig.badgeClass}>
          {statusConfig.badgeText}
        </Badge>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-1">
          <Zap className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">-{strike.xpPenalty}</span>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-1">
          <Banknote className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">-{strike.pointsPenalty}</span>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex justify-end">
          <Button size="sm" className={`h-8  ${actionConfig.buttonClass}`}>
            {actionConfig.icon}
            {actionConfig.buttonText}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function MyJourneyPage() {
  return (
    <main className="p-8">
      {/* Profile Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{myJourneyData.user.name}</h1>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 px-3 py-1"
          >
            {myJourneyData.user.status}
          </Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Set Status
          </Button>
          <Button size="sm" className="bg-black text-white hover:bg-gray-800">
            <FileText className="h-4 w-4 mr-2" />
            Submit Weekly Report
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {myJourneyData.statsCards.map((card, index) => (
          <StatsCardComponent
            key={index}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            iconColor={card.iconColor}
          />
        ))}
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Achievements
          </TabsTrigger>
          <TabsTrigger
            value="weekly-reports"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Weekly Reports
          </TabsTrigger>
          <TabsTrigger value="strikes" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Strikes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Achievements</h2>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Read About Achievements
            </Button>
          </div>

          {/* Achievement Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {myJourneyData.achievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                title={achievement.title}
                description={achievement.description}
                status={achievement.status}
                points={achievement.points}
                xp={achievement.xp}
              />
            ))}
          </div>

          {/* Tasks Table */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Tasks</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Task
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Difficulty
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      XP
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Points
                    </th>
                    <th className="text-right py-4 px-4 font-medium text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myJourneyData.tasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="weekly-reports" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">This Week Progress</h2>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Read About Weekly Reports
            </Button>
          </div>

          {/* Weekly Reports Table */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Reports</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Week
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Date Filled
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-right py-4 px-4 font-medium text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myJourneyData.weeklyReports.map((report) => (
                    <WeeklyReportRow key={report.id} report={report} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="strikes" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Strikes & Issues</h2>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Read About Strikes
            </Button>
          </div>

          {/* Strikes Table */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Strikes</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Strike
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      XP Penalty
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-gray-500">
                      Points Penalty
                    </th>
                    <th className="text-right py-4 px-4 font-medium text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myJourneyData.strikes.map((strike) => (
                    <StrikeRow key={strike.id} strike={strike} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
