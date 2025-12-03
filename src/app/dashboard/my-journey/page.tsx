"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  FileText,
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
import { Strike } from "@/types/my-journey";
import { TaskTableItem } from "@/types/team-journey";
import { AchievementCard } from "@/components/my-journey/achievement-card";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { IndividualWeeklyReportsTable } from "@/components/weekly-reports/individual-weekly-reports-table";
import { IndividualWeeklyReportModal } from "@/components/weekly-reports/individual-weekly-report-modal";
import {
  getUserProfile,
  getUserAchievementProgress,
  getUserTaskCompletionStats,
  getUserTasksVisible,
} from "@/lib/database";
import { hasUserSubmittedThisWeekIndividual } from "@/lib/weekly-reports";
import { startTaskLazy } from "@/lib/tasks";
import { useAppContext } from "@/contexts/app-context";

// Real task row component for actual user tasks
function RealTaskRow({
  task,
  onStartTask,
}: {
  task: TaskTableItem;
  onStartTask?: (taskId: string) => void;
}) {
  const router = useRouter();
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
              <Medal className="h-4 w-4 text-black dark:text-white" />
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
            <Zap className="h-4 w-4 text-black dark:text-white" />
            <span className="text-sm font-medium">{task.xp}</span>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex items-center gap-1">
            <Banknote className="h-4 w-4 text-black dark:text-white" />
            <span className="text-sm font-medium">{task.points}</span>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex justify-end gap-2">
            {task.status === "Finished" ? (
              <>
                <Button
                  size="sm"
                  className="h-8 bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                  disabled
                >
                  <CheckCircle className="h-3 w-3 mr-1 text-white" />
                  Done
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs px-3 py-2 border-[#0000ff] text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                  onClick={() => {
                    router.push(`/dashboard/my-journey/task/${task.id}`);
                  }}
                >
                  View Info
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className={`h-8 ${statusButtonConfig.buttonClass}`}
                disabled={task.status === "Peer Review"}
                onClick={() => {
                  if (
                    task.status === "Not Started" &&
                    onStartTask &&
                    task.task_id
                  ) {
                    // Use task_id for starting new tasks (lazy progress creation)
                    onStartTask(task.task_id);
                  } else if (task.status === "In Progress") {
                    // Navigate to task detail page for continuing/submitting
                    router.push(`/dashboard/my-journey/task/${task.id}`);
                  }
                }}
              >
                {statusButtonConfig.icon}
                {statusButtonConfig.buttonText}
              </Button>
            )}
          </div>
        </td>
      </tr>
      {/* Peer Review Feedback Row */}
      {task.reviewFeedback && (
        <tr className="bg-primary/5 border-b border-border">
          <td colSpan={6} className="py-3 px-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
                <MessageSquare className="h-3 w-3 text-black dark:text-white" />
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
          buttonClass: "bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90",
          icon: <CheckCircle className="h-3 w-3 mr-1 text-white" />,
        };
      case "explain":
        return {
          buttonText: "Explain",
          buttonClass:
            "border border-[#0000ff] text-[#0000ff] hover:bg-[#0000ff] hover:text-white bg-background",
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
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
            <AlertTriangle className="h-4 w-4 text-black dark:text-white" />
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
          <Zap className="h-4 w-4 text-black dark:text-white" />
          <span className="text-sm font-medium">-{strike.xpPenalty}</span>
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-1">
          <Banknote className="h-4 w-4 text-black dark:text-white" />
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
  const [achievements, setAchievements] = useState<
    {
      achievement_id: string;
      achievement_name: string;
      status: "completed" | "in-progress" | "not-started";
      xp_reward: number;
      points_reward: number;
      completed_tasks: number;
      total_tasks: number;
    }[]
  >([]);
  const [userProfile, setUserProfile] = useState<{
    name: string | null;
    status: string | null;
    total_xp: number | null;
    total_points: number | null;
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
  const [isIndividualReportModalOpen, setIsIndividualReportModalOpen] =
    useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasSubmittedThisWeek, setHasSubmittedThisWeek] = useState(false);

  // Task interaction handlers using new lazy progress architecture
  const handleStartTask = async (taskId: string) => {
    if (!user?.id) return;

    try {
      console.log("Starting individual task:", taskId);
      const success = await startTaskLazy(
        taskId,
        undefined, // no teamId for individual context
        user.id,
        "individual"
      );

      if (success) {
        console.log("Task started successfully, refreshing data...");
        // Refresh the task data to show updated status
        await fetchUserData();
      } else {
        console.error("Failed to start task");
        alert("Failed to start task. Please try again.");
      }
    } catch (error) {
      console.error("Error starting task:", error);
      alert("Failed to start task. Please try again.");
    }
  };

  const fetchUserData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        profile,
        individualTasksData,
        achievementProgress,
        taskStats,
        submissionStatus,
      ] = await Promise.all([
        getUserProfile(user.id),
        getUserTasksVisible(user.id),
        getUserAchievementProgress(user.id),
        getUserTaskCompletionStats(user.id),
        hasUserSubmittedThisWeekIndividual(user.id),
      ]);

      setHasSubmittedThisWeek(submissionStatus);

      setUserProfile(profile);

      // Process achievements from getUserAchievementProgress
      const achievementsData = Array.isArray(achievementProgress)
        ? achievementProgress
        : [];
      setAchievements(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        achievementsData.map((ach: any) => ({
          achievement_id: ach.achievement_id,
          achievement_name: ach.achievement_name,
          status: ach.status as "completed" | "in-progress" | "not-started",
          xp_reward: ach.xp_reward || 0,
          points_reward: ach.points_reward || 0,
          completed_tasks: ach.completed_tasks || 0,
          total_tasks: ach.total_tasks || 0,
        }))
      );

      // Convert individual tasks to TaskTableItem format
      const convertedTasks: TaskTableItem[] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (individualTasksData as any[]).map((task: any) => {
          const getUIStatus = (
            status: string | null
          ): TaskTableItem["status"] => {
            if (!status) return "Not Started";
            switch (status) {
              case "approved":
                return "Finished";
              case "in_progress":
                return "In Progress";
              case "rejected":
              case "revision_required":
                return "Not Accepted";
              case "pending_review":
                return "Peer Review";
              case "not_started":
              default:
                return "Not Started";
            }
          };

          const getDifficulty = (
            level: number
          ): TaskTableItem["difficulty"] => {
            if (level >= 4) return "Hard";
            if (level >= 3) return "Medium";
            return "Easy";
          };

          return {
            id: task.progress_id || task.task_id, // Use progress_id if exists, otherwise task_id for new lazy approach
            title: task.task_title || task.title,
            description: task.task_description || task.description,
            difficulty: getDifficulty(task.difficulty_level),
            xp: task.base_xp_reward,
            points: task.base_points_reward || task.base_xp_reward,
            status: getUIStatus(task.progress_status),
            action: task.progress_status === "approved" ? "done" : "complete",
            isAvailable: true,
            reviewFeedback: task.reviewer_notes,
            reviewerName: undefined,
            reviewerAvatarUrl: undefined,
            teamName: undefined,
            assignedAt: task.assigned_at,
            completedAt: task.completed_at,
            task_id: task.task_id, // Store original task_id for starting new tasks
          };
        });

      setUserTasks(convertedTasks);

      // Calculate dynamic stats cards
      const totalXP = profile?.total_xp || 0;
      const totalCredits = profile?.total_points || 0;
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
          iconColor: "text-black dark:text-white",
        },
        {
          title: "Total Credits",
          value: totalCredits.toLocaleString(),
          subtitle: "Earned credits",
          icon: Banknote,
          iconColor: "text-black dark:text-white",
        },
        {
          title: "Tasks Completed",
          value: tasksCompleted.toString(),
          subtitle: `${taskStats.completionRate}% completion rate`,
          icon: CheckCircle,
          iconColor: "text-black dark:text-white",
        },
        {
          title: "Achievement Rate",
          value: `${achievementRate}%`,
          subtitle: `${completedAchievements} of ${achievements.length} completed`,
          icon: Trophy,
          iconColor: "text-black dark:text-white",
        },
      ];
      setStatsCards(dynamicStatsCards);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

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
            className="bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90 px-3 py-1"
          >
            {loading ? "Loading..." : userProfile?.status || "Active"}
          </Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4 text-black dark:text-white" />
            Set Status
          </Button>
          <Button
            size="sm"
            className="bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
            onClick={() => setIsIndividualReportModalOpen(true)}
            disabled={hasSubmittedThisWeek}
          >
            <FileText className="h-4 w-4 mr-2 text-white" />
            {hasSubmittedThisWeek ? "Report Submitted" : "Submit Weekly Report"}
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
            <Trophy className="h-4 w-4 text-black dark:text-white" />
            Achievements
          </TabsTrigger>
          <TabsTrigger
            value="weekly-reports"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4 text-black dark:text-white" />
            Weekly Reports
          </TabsTrigger>
          <TabsTrigger value="strikes" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-black dark:text-white" />
            Strikes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Achievements</h2>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4 text-black dark:text-white" />
              Read About Achievements
            </Button>
          </div>

          {/* Achievement Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <div className="text-muted-foreground">
                  Loading achievements...
                </div>
              </div>
            ) : achievements.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No achievements available yet
              </div>
            ) : (
              achievements.map((achievement) => (
                <AchievementCard
                  key={achievement.achievement_id}
                  title={achievement.achievement_name}
                  description={`${achievement.completed_tasks} of ${achievement.total_tasks} tasks completed`}
                  status={
                    achievement.status === "completed"
                      ? "finished"
                      : achievement.status
                  }
                  points={achievement.points_reward}
                  xp={achievement.xp_reward}
                />
              ))
            )}
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
                No individual tasks assigned yet. Check back later for new
                challenges!
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
                      <RealTaskRow
                        key={task.id}
                        task={task}
                        onStartTask={handleStartTask}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="weekly-reports" className="space-y-6">
          {/* Individual Weekly Reports */}
          {user?.id && (
            <IndividualWeeklyReportsTable key={refreshKey} userId={user.id} />
          )}
        </TabsContent>

        <TabsContent value="strikes" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Strikes & Issues</h2>
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4 text-black dark:text-white" />
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

      {/* Individual Weekly Report Modal */}
      {user?.id && (
        <IndividualWeeklyReportModal
          open={isIndividualReportModalOpen}
          onOpenChange={setIsIndividualReportModalOpen}
          userId={user.id}
          onSuccess={() => {
            // Trigger refresh of the reports table and submission status
            setRefreshKey((prev) => prev + 1);
            fetchUserData(); // Refresh all data including submission status
            console.log("Weekly report submitted successfully");
          }}
        />
      )}
    </main>
  );
}
