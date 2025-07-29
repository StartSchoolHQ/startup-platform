"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Settings,
  FileText,
  Trophy,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Shield,
  CheckCircle,
  Clock,
  Zap,
  Banknote,
  Medal,
} from "lucide-react";
import { myJourneyData } from "@/data/my-journey-data";
import { MyJourneyStatsCard, Task, WeeklyReport, Strike } from "@/types/my-journey";
import { AchievementCard } from "@/components/my-journey/achievement-card";

// Reusable stats card component
function StatsCardComponent({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
}: MyJourneyStatsCard) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
        <Icon className={`h-8 w-8 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// Task row component
function TaskRow({ task }: { task: Task }) {
  const getDifficultyConfig = (difficulty: Task["difficulty"]) => {
    switch (difficulty) {
      case "easy":
        return { text: "Easy", class: "bg-green-100 text-green-800" };
      case "medium":
        return { text: "Medium", class: "bg-yellow-100 text-yellow-800" };
      case "hard":
        return { text: "Hard", class: "bg-red-100 text-red-800" };
    }
  };

  const difficultyConfig = getDifficultyConfig(task.difficulty);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-md ${task.action === "done" ? "bg-green-100" : "bg-gray-100"}`}>
            {task.action === "done" ? (
              <Medal className="h-4 w-4 text-green-600" />
            ) : (
              <Medal className="h-4 w-4 text-gray-500" />
            )}
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
        <Badge variant="secondary" className={difficultyConfig.class}>
          {difficultyConfig.text}
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
        <div className="flex items-center justify-end gap-2">
          {task.tips && (
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-800 px-2 py-1 h-auto text-xs"
            >
              Tips
            </Button>
          )}
          {task.action === "done" ? (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Done
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-8 px-3">
              <Clock className="h-3 w-3 mr-1" />
              Complete
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

// Weekly Report row component
function WeeklyReportRow({ report }: { report: WeeklyReport }) {
  const getStatusConfig = (status: WeeklyReport["status"]) => {
    switch (status) {
      case "complete":
        return {
          buttonText: "Complete",
          buttonClass: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
          icon: <Clock className="h-3 w-3 mr-1" />
        };
      case "done":
        return {
          buttonText: "Done",
          buttonClass: "bg-green-600 text-white hover:bg-green-700",
          icon: <CheckCircle className="h-3 w-3 mr-1" />
        };
      case "missed":
        return {
          buttonText: "Missed",
          buttonClass: "bg-red-600 text-white hover:bg-red-700",
          icon: <AlertTriangle className="h-3 w-3 mr-1" />
        };
    }
  };

  const statusConfig = getStatusConfig(report.status);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-md ${
              report.iconColor === "green" ? "bg-green-100" : "bg-red-100"
            }`}
          >
            <Calendar
              className={`h-4 w-4 ${
                report.iconColor === "green"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            />
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
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-white">W</span>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <span className="text-sm font-medium">{report.dateFilled}</span>
      </td>
      <td className="py-4 px-4">
        <div className="flex justify-end">
          <Button size="sm" className={`h-8  ${statusConfig.buttonClass}`}>
            {statusConfig.icon}
            {statusConfig.buttonText}
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
          badgeClass: "bg-green-100 text-green-800"
        };
      case "waiting-explanation":
        return {
          badgeText: "Waiting on Explanation",
          badgeClass: "bg-red-100 text-red-800"
        };
    }
  };

  const getActionConfig = (action: Strike["action"]) => {
    switch (action) {
      case "done":
        return {
          buttonText: "Done",
          buttonClass: "bg-green-600 text-white hover:bg-green-700",
          icon: <CheckCircle className="h-3 w-3 mr-1" />
        };
      case "explain":
        return {
          buttonText: "Explain",
          buttonClass: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
          icon: <Clock className="h-3 w-3 mr-1" />
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

// Profile header component
function ProfileHeader() {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{myJourneyData.user.name}</h1>
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-800 hover:bg-green-100"
        >
          {myJourneyData.user.status}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" className="bg-black text-white hover:bg-gray-800">
          <Settings className="h-4 w-4 mr-2" />
          Set Status
        </Button>
        <Button size="sm" className="bg-black text-white hover:bg-gray-800">
          <FileText className="h-4 w-4 mr-2" />
          Submit Weekly Report
        </Button>
      </div>
    </div>
  );
}

export default function MyJourneyPage() {
  return (
    <main className="p-8">
      {/* Profile Header */}
      <ProfileHeader />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Achievements
          </TabsTrigger>
          <TabsTrigger
            value="weekly-reports"
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Weekly Reports
          </TabsTrigger>
          <TabsTrigger value="strikes" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Strikes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="mt-6">
          {/* Achievements Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Achievements</h2>
            <Button variant="outline" className="p-2 h-auto font-medium">
              <ExternalLink className="h-4 w-4 mr-2" />
              Read About Achievements
            </Button>
          </div>

          {/* Achievement Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          <div className="bg-white ">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                      Task
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                      Difficulty
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                      XP
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                      Points
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-gray-700">
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

        <TabsContent value="weekly-reports" className="mt-6">
          {/* Weekly Reports Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">This Week Progress</h2>
            <Button variant="outline" className="p-2 h-auto font-medium">
              <ExternalLink className="h-4 w-4 mr-2" />
              Read About Weekly Reports
            </Button>
          </div>

          {/* Weekly Reports Table */}
          <div className="bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                      Weekly
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                      Weekly Fill
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                      Date Filled
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-gray-700">
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

        <TabsContent value="strikes" className="mt-6">
          {/* Strikes Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Strikes & Issues</h2>
            <Button variant="outline" className="p-2 h-auto font-medium">
              <ExternalLink className="h-4 w-4 mr-2" />
              Read About Strikes
            </Button>
          </div>

          {/* Strikes Table */}
          <div className="bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                      Strike
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                      - XP
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-gray-700">
                      - Points
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-gray-700">
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
