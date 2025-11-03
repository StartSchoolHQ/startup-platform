"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  FileText,
  Calendar,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
  Clock,
  Zap,
  Banknote,
  Medal,
  Settings,
  MessageSquare,
  LucideIcon,
} from "lucide-react";
import { myJourneyData } from "@/data/my-journey-data";
import { WeeklyReport, Strike } from "@/types/my-journey";
import { TaskTableItem } from "@/types/team-journey";
import { AchievementCard } from "@/components/my-journey/achievement-card";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { getUserTasks } from "@/lib/tasks";
import {
  getUserProfile,
  getUserAchievementProgress,
  getUserTaskCompletionStats,
} from "@/lib/database";
import { useAppContext } from "@/contexts/app-context";

// Real task row component for actual user tasks
function RealTaskRow({ task }: { task: TaskTableItem }) {
  const getStatusButtonConfig = (status: TaskTableItem["status"]) => {
    switch (status) {
      case "Finished":
        return {
          buttonText: "Done",
          buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "In Progress":
        return {
          buttonText: "Continue",
          buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
      case "Not Accepted":
        return {
          buttonText: "Retry",
          buttonClass:
            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          icon: <AlertTriangle className="h-3 w-3 mr-1" />,
        };
      case "Peer Review":
        return {
          buttonText: "Waiting",
          buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
      case "Not Started":
      default:
        return {
          buttonText: "Start",
          buttonClass:
            "bg-background border border-input text-foreground hover:bg-accent",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
    }
  };

  const statusButtonConfig = getStatusButtonConfig(task.status);

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/50">
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-md ${
                task.status === "Finished" ? "bg-primary/10" : "bg-muted"
              }`}
            >
              <Medal className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{task.title}</div>
              <div className="text-xs text-muted-foreground">
                {task.description}
              </div>
              {task.teamName && (
                <div className="text-xs text-primary mt-1">
                  Team: {task.teamName}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          <DifficultyBadge
            level={
              task.difficulty === "Easy"
                ? 1
                : task.difficulty === "Medium"
                ? 2
                : 3
            }
          />
        </td>
        <td className="py-4 px-4">
          <StatusBadge
            status={
              task.status === "Finished"
                ? "approved"
                : task.status === "Not Accepted"
                ? "rejected"
                : task.status === "Peer Review"
                ? "pending_review"
                : task.status === "In Progress"
                ? "in_progress"
                : "not_started"
            }
            variant="journey"
          />
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">{task.xp}</span>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center gap-1">
            <Banknote className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">{task.points}</span>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              className={`h-8 ${statusButtonConfig.buttonClass}`}
              disabled={
                task.status === "Peer Review" || task.status === "Finished"
              }
            >
              {statusButtonConfig.icon}
              {statusButtonConfig.buttonText}
            </Button>
          </div>
        </td>
      </tr>
      {/* Peer Review Feedback Row */}
      {task.reviewFeedback && (
        <tr className="bg-primary/5 border-b border-border">
          <td colSpan={6} className="py-3 px-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                <MessageSquare className="h-3 w-3 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-primary mb-1">
                  Peer Review Feedback:
                </div>
                <div className="text-sm text-foreground bg-card rounded-md p-2 border border-border">
                  {task.reviewFeedback}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// Task row component (kept for legacy data)
// Weekly report row component
function WeeklyReportRow({ report }: { report: WeeklyReport }) {
  const getActionConfig = (status: WeeklyReport["status"]) => {
    switch (status) {
      case "complete":
        return {
          buttonText: "Complete",
          buttonClass:
            "bg-background border border-border text-foreground hover:bg-accent",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
      case "done":
        return {
          buttonText: "Done",
          buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "missed":
        return {
          buttonText: "Missed",
          buttonClass:
            "bg-destructive text-destructive-foreground hover:bg-destructive/80",
          icon: <AlertTriangle className="h-3 w-3 mr-1" />,
        };
    }
  };

  const actionConfig = getActionConfig(report.status);

  return (
    <tr className="border-b border-border hover:bg-muted/50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
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
              report.iconColor === "green" ? "text-green-600" : "text-red-600"
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
          badgeClass: "bg-primary/10 text-primary",
        };
      case "waiting-explanation":
        return {
          badgeText: "Waiting on Explanation",
          badgeClass: "bg-destructive/10 text-destructive",
        };
    }
  };

  const getActionConfig = (action: Strike["action"]) => {
    switch (action) {
      case "done":
        return {
          buttonText: "Done",
          buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "explain":
        return {
          buttonText: "Explain",
          buttonClass:
            "bg-background border border-border text-foreground hover:bg-accent",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
    }
  };

  const statusConfig = getStatusConfig(strike.status);
  const actionConfig = getActionConfig(strike.action);

  return (
    <tr className="border-b border-border hover:bg-muted/50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-destructive/10">
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
  const { user } = useAppContext();
  const [userTasks, setUserTasks] = useState<TaskTableItem[]>([]);
  const [userProfile, setUserProfile] = useState<{
    name: string | null;
    status: string | null;
    total_xp: number | null;
    individual_points: number | null;
  } | null>(null);
  const [statsCards, setStatsCards] = useState<
    {
      title: string;
      value: string;
      subtitle: string;
      icon: LucideIcon;
      iconColor: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        // Fetch all data in parallel
        const [profile, tasks, achievementProgress, taskStats] =
          await Promise.all([
            getUserProfile(user.id),
            getUserTasks(user.id),
            getUserAchievementProgress(user.id),
            getUserTaskCompletionStats(user.id),
          ]);

        setUserProfile(profile);
        setUserTasks(tasks);

        // Calculate dynamic stats cards
        const totalXP = profile?.total_xp || 0;
        const totalCredits = profile?.individual_points || 0;
        const tasksCompleted = taskStats.completed;
        const totalTasks = taskStats.total;

        // Calculate achievement rate
        const achievements = Array.isArray(achievementProgress)
          ? achievementProgress
          : [];
        const completedAchievements = achievements.filter(
          (a: { is_completed?: boolean }) => a.is_completed
        ).length;
        const achievementRate =
          achievements.length > 0
            ? Math.round((completedAchievements / achievements.length) * 100)
            : 0;

        const dynamicStatsCards = [
          {
            title: "Total XP",
            value: totalXP.toLocaleString(),
            subtitle: `From ${totalTasks} tasks`,
            icon: Zap,
            iconColor: "text-green-500",
          },
          {
            title: "Total Credits",
            value: totalCredits.toLocaleString(),
            subtitle: "Earned credits",
            icon: Banknote,
            iconColor: "text-blue-500",
          },
          {
            title: "Tasks Completed",
            value: tasksCompleted.toString(),
            subtitle: `${taskStats.completionRate}% completion rate`,
            icon: CheckCircle,
            iconColor: "text-primary",
          },
          {
            title: "Achievement Rate",
            value: `${achievementRate}%`,
            subtitle: `${completedAchievements} of ${achievements.length} completed`,
            icon: Trophy,
            iconColor: "text-yellow-500",
          },
        ];
        setStatsCards(dynamicStatsCards);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user?.id]);

  return (
    <main className="p-8">
      {/* Profile Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {loading ? "Loading..." : userProfile?.name || "User"}
          </h1>
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary px-3 py-1"
          >
            {loading ? "Loading..." : userProfile?.status || "Active"}
          </Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Set Status
          </Button>
          <Button
            size="sm"
            className="bg-foreground text-background hover:bg-foreground/80"
          >
            <FileText className="h-4 w-4 mr-2" />
            Submit Weekly Report
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading
          ? // Loading skeleton for stats cards
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-card rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </div>
            ))
          : statsCards.map((card, index) => (
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
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">My Tasks</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading tasks...</div>
              </div>
            ) : userTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tasks assigned yet. Join a team to get started!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                        Task
                      </th>
                      <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                        Difficulty
                      </th>
                      <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                        XP
                      </th>
                      <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                        Points
                      </th>
                      <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTasks.map((task) => (
                      <RealTaskRow key={task.id} task={task} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Reports</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Week
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Date Filled
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-right py-4 px-4 font-medium text-muted-foreground">
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
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Strikes</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Strike
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      XP Penalty
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Points Penalty
                    </th>
                    <th className="text-right py-4 px-4 font-medium text-muted-foreground">
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
