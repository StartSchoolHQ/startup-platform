"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import {
  getUserProfile,
  getUserAchievementProgress,
  getUserTaskCompletionStats,
  getUserTasksVisible,
  getUserIndividualTasks,
  getIndividualXPAndCredits,
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
          icon: <CheckCircle className="mr-1 h-3 w-3" />,
        };
      case "In Progress":
        return {
          buttonText: "Continue",
          buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: <Clock className="mr-1 h-3 w-3" />,
        };
      case "Not Accepted":
        return {
          buttonText: "Retry",
          buttonClass:
            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          icon: <AlertTriangle className="mr-1 h-3 w-3" />,
        };
      case "Peer Review":
        return {
          buttonText: "Waiting",
          buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: <Clock className="mr-1 h-3 w-3" />,
        };
      case "Cooldown":
        return {
          buttonText: "Cooldown",
          buttonClass: "bg-blue-500 text-white hover:bg-blue-600",
          icon: <Clock className="mr-1 h-3 w-3" />,
        };
      case "Not Started":
      default:
        return {
          buttonText: "Start",
          buttonClass:
            "bg-background border border-input text-foreground hover:bg-accent",
          icon: <Clock className="mr-1 h-3 w-3" />,
        };
    }
  };

  const statusButtonConfig = getStatusButtonConfig(task.status);

  return (
    <>
      <tr className="border-border hover:bg-muted/50 border-b">
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-md ${
                task.status === "Finished" ? "bg-primary/10" : "bg-muted"
              }`}
            >
              <Medal className="h-4 w-4 text-black dark:text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{task.title}</div>
              <div className="text-muted-foreground text-xs">
                {task.description}
              </div>
              {task.teamName && (
                <div className="text-primary mt-1 text-xs">
                  Team: {task.teamName}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
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
        <td className="px-4 py-4">
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
        <td className="px-4 py-4">
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-black dark:text-white" />
            <span className="text-sm font-medium">{task.xp}</span>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-1">
            <Banknote className="h-4 w-4 text-black dark:text-white" />
            <span className="text-sm font-medium">{task.points}</span>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex justify-end gap-2">
            {task.status === "Finished" ? (
              <>
                <Button
                  size="sm"
                  className="h-8 bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                  disabled
                >
                  <CheckCircle className="mr-1 h-3 w-3 text-white" />
                  Done
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#0000ff] px-3 py-2 text-xs text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
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
        <tr className="bg-primary/5 border-border border-b">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full">
                <MessageSquare className="h-3 w-3 text-black dark:text-white" />
              </div>
              <div className="flex-1">
                <div className="text-primary mb-1 text-sm font-medium">
                  Peer Review Feedback:
                </div>
                <div className="text-foreground bg-card border-border rounded-md border p-2 text-sm">
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
          icon: <CheckCircle className="mr-1 h-3 w-3 text-white" />,
        };
      case "explain":
        return {
          buttonText: "Explain",
          buttonClass:
            "border border-[#0000ff] text-[#0000ff] hover:bg-[#0000ff] hover:text-white bg-background",
          icon: <Clock className="mr-1 h-3 w-3" />,
        };
    }
  };

  const statusConfig = getStatusConfig(strike.status);
  const actionConfig = getActionConfig(strike.action);

  return (
    <tr className="border-border hover:bg-muted/50 border-b">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-md">
            <AlertTriangle className="h-4 w-4 text-black dark:text-white" />
          </div>
          <div>
            <div className="text-sm font-medium">{strike.title}</div>
            <div className="text-muted-foreground text-xs">{strike.date}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <Badge variant="secondary" className={statusConfig.badgeClass}>
          {statusConfig.badgeText}
        </Badge>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1">
          <Zap className="h-4 w-4 text-black dark:text-white" />
          <span className="text-sm font-medium">-{strike.xpPenalty}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1">
          <Banknote className="h-4 w-4 text-black dark:text-white" />
          <span className="text-sm font-medium">-{strike.pointsPenalty}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-end">
          <Button size="sm" className={`h-8 ${actionConfig.buttonClass}`}>
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
  const queryClient = useQueryClient();

  // UI state only
  const [isIndividualReportModalOpen, setIsIndividualReportModalOpen] =
    useState(false);
  const [selectedAchievementId, setSelectedAchievementId] = useState<
    string | null
  >(null);

  // React Query: Fetch all data in parallel
  const { data: profile } = useQuery({
    queryKey: ["myJourney", "profile", user?.id],
    queryFn: () => getUserProfile(user!.id),
    enabled: !!user?.id,
  });

  const { data: availableTasksData = [] } = useQuery({
    queryKey: ["myJourney", "availableTasks", user?.id],
    queryFn: () => getUserTasksVisible(user!.id),
    enabled: !!user?.id,
  });

  const { data: individualTasksData = [] } = useQuery({
    queryKey: ["myJourney", "individualTasks", user?.id],
    queryFn: () => getUserIndividualTasks(user!.id),
    enabled: !!user?.id,
  });

  const { data: achievementProgress = [] } = useQuery({
    queryKey: ["myJourney", "achievements", user?.id],
    queryFn: () => getUserAchievementProgress(user!.id),
    enabled: !!user?.id,
  });

  const { data: taskStats = { completed: 0, completionRate: 0 } } = useQuery({
    queryKey: ["myJourney", "taskStats", user?.id],
    queryFn: () => getUserTaskCompletionStats(user!.id),
    enabled: !!user?.id,
  });

  const { data: hasSubmittedThisWeek = false } = useQuery({
    queryKey: ["myJourney", "weeklySubmission", user?.id],
    queryFn: () => hasUserSubmittedThisWeekIndividual(user!.id),
    enabled: !!user?.id,
  });

  const { data: individualStats } = useQuery({
    queryKey: ["myJourney", "xpCredits", user?.id],
    queryFn: () => getIndividualXPAndCredits(user!.id),
    enabled: !!user?.id,
  });

  // Check if any query is loading
  const loading =
    !user?.id || !profile || !availableTasksData || !individualTasksData;

  // Derived data: Process tasks (memoized)
  const userTasks = useMemo(() => {
    if (!user?.id) return [];

    const taskMap = new Map();

    const getUIStatus = (status: string | null): TaskTableItem["status"] => {
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

    const getDifficulty = (level: number): TaskTableItem["difficulty"] => {
      if (level >= 4) return "Hard";
      if (level >= 3) return "Medium";
      return "Easy";
    };

    // Process available tasks
    (availableTasksData as any[]).forEach((task: any) => {
      const taskItem: TaskTableItem = {
        id: task.progress_id || `temp-${task.task_id}`,
        title: task.task_title || task.title,
        description: task.task_description || task.description,
        difficulty: getDifficulty(task.difficulty_level),
        xp: task.base_xp_reward,
        points: task.base_points_reward || task.base_xp_reward,
        status: getUIStatus(task.progress_status),
        action: task.progress_status === "approved" ? "done" : "complete",
        isAvailable: task.is_available,
        reviewFeedback: task.reviewer_notes,
        reviewerName: undefined,
        reviewerAvatarUrl: undefined,
        teamName: undefined,
        assignedAt: task.assigned_at,
        completedAt: task.completed_at,
        task_id: task.task_id,
        achievement_id: task.achievement_id,
      };
      taskMap.set(task.task_id, taskItem);
    });

    // Process individual tasks
    (individualTasksData as any[]).forEach((task: any) => {
      const taskItem: TaskTableItem = {
        id: task.progress_id || task.task_id,
        title: task.task_title || task.title,
        description: task.task_description || task.description,
        difficulty: getDifficulty(task.difficulty_level),
        xp: task.base_xp_reward,
        points: task.base_points_reward || task.base_xp_reward,
        status: getUIStatus(task.progress_status),
        action: task.progress_status === "approved" ? "done" : "complete",
        isAvailable: task.is_available ?? true,
        reviewFeedback: task.reviewer_notes,
        reviewerName: undefined,
        reviewerAvatarUrl: undefined,
        teamName: undefined,
        assignedAt: task.assigned_at,
        completedAt: task.completed_at,
        task_id: task.task_id,
        achievement_id: task.achievement_id,
      };
      taskMap.set(task.task_id, taskItem);
    });

    return Array.from(taskMap.values());
  }, [user?.id, availableTasksData, individualTasksData]);

  // Derived data: Process achievements (memoized)
  const achievements = useMemo(() => {
    const achievementsData = Array.isArray(achievementProgress)
      ? achievementProgress
      : [];
    return achievementsData.map((ach: any) => ({
      achievement_id: ach.achievement_id,
      achievement_name: ach.achievement_name,
      status: ach.status as "completed" | "in-progress" | "not-started",
      xp_reward: ach.xp_reward || 0,
      points_reward: ach.points_reward || 0,
      completed_tasks: ach.completed_tasks || 0,
      total_tasks: ach.total_tasks || 0,
    }));
  }, [achievementProgress]);

  // Derived data: Stats cards (memoized)
  const statsCards = useMemo(() => {
    const totalXP = individualStats?.totalXP || 0;
    const totalCredits = individualStats?.totalCredits || 0;
    const tasksCompleted = taskStats.completed;

    const completedAchievements = achievements.filter(
      (a) => a.status === "completed"
    ).length;
    const achievementRate =
      achievements.length > 0
        ? Math.round((completedAchievements / achievements.length) * 100)
        : 0;

    return [
      {
        title: "Total XP",
        value: totalXP.toLocaleString(),
        subtitle: `From individual tasks & peer reviews`,
        icon: Zap,
        iconColor: "text-black dark:text-white",
      },
      {
        title: "Total Credits",
        value: totalCredits.toLocaleString(),
        subtitle: "From individual activities",
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
  }, [individualStats, taskStats, achievements]);

  // Achievement click handler for filtering tasks
  const handleAchievementClick = (achievementId: string | null) => {
    setSelectedAchievementId(achievementId);
  };

  // Mutation: Start task with optimistic update
  const startTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      startTaskLazy(taskId, undefined, user!.id, "individual"),
    onMutate: async (taskId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["myJourney"] });

      // Optimistically update cache
      queryClient.setQueryData(
        ["myJourney", "availableTasks", user?.id],
        (old: any[] = []) =>
          old.map((task) =>
            task.task_id === taskId
              ? {
                  ...task,
                  progress_status: "in_progress",
                  assigned_at: new Date().toISOString(),
                }
              : task
          )
      );
    },
    onSuccess: () => {
      // Refetch to ensure server state consistency
      queryClient.invalidateQueries({ queryKey: ["myJourney"] });
    },
    onError: () => {
      toast.error("Failed to start task", {
        description:
          "Please try again or contact support if the issue persists.",
      });
      // Refetch on error to revert optimistic update
      queryClient.invalidateQueries({ queryKey: ["myJourney"] });
    },
  });

  const handleStartTask = (taskId: string) => {
    if (!user?.id) return;
    startTaskMutation.mutate(taskId);
  };

  // Client-side filtering (derived from userTasks)
  const filteredTasks = useMemo(() => {
    if (selectedAchievementId) {
      return userTasks.filter(
        (task) => task.achievement_id === selectedAchievementId
      );
    }
    return userTasks;
  }, [selectedAchievementId, userTasks]);

  return (
    <main className="p-8">
      {/* Profile Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">
            {loading ? "Loading..." : profile?.name || "User"}
          </h1>
          <Badge
            variant="secondary"
            className="bg-[#ff78c8] px-3 py-1 text-white hover:bg-[#ff78c8]/90"
          >
            {loading ? "Loading..." : profile?.status || "Active"}
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
            <FileText className="mr-2 h-4 w-4 text-white" />
            {hasSubmittedThisWeek ? "Report Submitted" : "Submit Weekly Report"}
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? // Loading skeleton for stats cards
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-card animate-pulse rounded-lg p-6">
                <div className="bg-muted mb-2 h-4 w-1/2 rounded"></div>
                <div className="bg-muted mb-2 h-8 w-3/4 rounded"></div>
                <div className="bg-muted h-3 w-full rounded"></div>
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
        <TabsList className="mb-8 grid w-full grid-cols-3">
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
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <div className="col-span-full flex items-center justify-center py-8">
                <div className="text-muted-foreground">
                  Loading achievements...
                </div>
              </div>
            ) : achievements.length === 0 ? (
              <div className="text-muted-foreground col-span-full py-8 text-center">
                No achievements available yet
              </div>
            ) : (
              achievements.map((achievement) => (
                <div
                  key={achievement.achievement_id}
                  onClick={() =>
                    handleAchievementClick(
                      selectedAchievementId === achievement.achievement_id
                        ? null
                        : achievement.achievement_id
                    )
                  }
                  className="cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                >
                  <AchievementCard
                    title={achievement.achievement_name}
                    description={
                      selectedAchievementId === achievement.achievement_id
                        ? "Click to show all tasks"
                        : "Click to filter tasks"
                    }
                    status={
                      achievement.status === "completed"
                        ? "finished"
                        : achievement.status
                    }
                    points={achievement.points_reward}
                    xp={achievement.xp_reward}
                    selected={
                      selectedAchievementId === achievement.achievement_id
                    }
                  />
                </div>
              ))
            )}
          </div>

          {/* Filter Status */}
          {selectedAchievementId && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800">
                  <span className="font-medium">Showing tasks for:</span>{" "}
                  {
                    achievements.find(
                      (a) => a.achievement_id === selectedAchievementId
                    )?.achievement_name
                  }
                </div>
                <button
                  onClick={() => handleAchievementClick(null)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Show All Tasks
                </button>
              </div>
            </div>
          )}

          {/* Tasks Table */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="mb-4 text-lg font-semibold">My Tasks</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading tasks...</div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                {selectedAchievementId
                  ? "No tasks found for this achievement"
                  : "No individual tasks assigned yet. Check back later for new challenges!"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-border border-b">
                      <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                        Task
                      </th>
                      <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                        Difficulty
                      </th>
                      <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                        Status
                      </th>
                      <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                        XP
                      </th>
                      <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                        Points
                      </th>
                      <th className="text-muted-foreground px-4 py-4 text-right font-medium">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((task) => (
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
          {user?.id && <IndividualWeeklyReportsTable userId={user.id} />}
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
            <h3 className="mb-4 text-lg font-semibold">Strikes</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Strike
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Status
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      XP Penalty
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Points Penalty
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-right font-medium">
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
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["myJourney"] });
          }}
        />
      )}
    </main>
  );
}
