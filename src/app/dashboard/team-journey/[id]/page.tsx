"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { AchievementCard } from "@/components/my-journey/achievement-card";
import { AddClientMeetingModal } from "@/components/team-journey/add-client-meeting-modal";
import { ClientMeetingsTable } from "@/components/team-journey/client-meetings-table";
import { ExplainStrikeModal } from "@/components/team-journey/explain-strike-modal";
import { StrikesTable } from "@/components/team-journey/strikes-table";
import { TasksTable } from "@/components/team-journey/tasks-table";
import { TeamManagementModal } from "@/components/team-journey/team-management-modal";
import { WeeklyReportsTable } from "@/components/team-journey/weekly-reports-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamDetailSkeleton } from "@/components/ui/team-detail-skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WeeklyReportModal } from "@/components/weekly-reports/weekly-report-modal";
import { useAppContext } from "@/contexts/app-context";
import {
  getTeamAchievementDashboard,
  getTeamDetails,
  getTeamStatsCombined,
  getTeamStrikes,
  getTeamTasksVisible,
  getTeamWeeklyReports,
  getUserTeamRole,
  isUserTeamMember,
} from "@/lib/database";
import { assignTaskToMember, startTask, startTaskLazy } from "@/lib/tasks";
import { hasUserSubmittedThisWeek } from "@/lib/weekly-reports";
import { StatsCard } from "@/types/dashboard";
import { TaskTableItem } from "@/types/team-journey";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronDown,
  CreditCard,
  ExternalLink,
  FileText,
  Plus,
  RotateCcw,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface Strike {
  id: string;
  title: string;
  datetime: string;
  status: "explained" | "waiting-explanation";
  xpPenalty: number;
  pointsPenalty: number;
  action: "done" | "explain";
}

interface WeeklyReportSubmission {
  submission_data?: {
    whatDidYouDoThisWeek?: string;
    whatWereYourBlockers?: string;
    whatWasYourBiggestAchievement?: string;
    clientsContacted?: number;
    meetingsHeld?: number;
  };
  users?: {
    name?: string;
    avatar_url?: string;
  };
}

interface WeeklyReport {
  id: string;
  week: string;
  dateRange: string;
  weeklyFill: {
    avatars: string[];
    names: string[];
  };
  clients: number;
  meetings: number;
  status: "complete" | "done" | "missed";
  submissions?: WeeklyReportSubmission[];
}

interface TeamDetails {
  id: string;
  name: string;
  description: string | null;
  website?: string | null;
  logo_url?: string | null;
  status: "active" | "archived";
  created_at: string | null;
  member_count: number | null;
  strikes_count?: number | null;
  members: {
    user_id: string;
    team_role: string | null;
    joined_at: string | null;
    users: {
      name: string | null;
      email: string;
      avatar_url: string | null;
      graduation_level: number | null;
      total_xp: number;
      total_points: number;
    } | null;
  }[];
}

export default function ProductDetailPage(props: ProductDetailPageProps) {
  const params = use(props.params);
  const { user, loading: userLoading } = useAppContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state synced to URL
  const validDetailTabs = [
    "achievements",
    "weekly-reports",
    "client-meetings",
    "strikes",
  ];
  const detailTabFromUrl = searchParams.get("tab");
  const activeDetailTab = validDetailTabs.includes(detailTabFromUrl ?? "")
    ? detailTabFromUrl!
    : "achievements";

  const setActiveDetailTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "achievements") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : window.location.pathname, {
        scroll: false,
      });
    },
    [searchParams, router]
  );

  // Extract team ID from params (needed for queries)
  const [teamId, setTeamId] = useState<string | null>(null);
  useEffect(() => {
    const extractId = async () => {
      const { id } = await params;
      setTeamId(id);
    };
    extractId();
  }, [params]);

  // UI state only
  const [activeModal, setActiveModal] = useState<
    "teamManagement" | "weeklyReport" | "addMeeting" | "explainStrike" | null
  >(null);
  const [selectedAchievementId, setSelectedAchievementId] = useState<
    string | null
  >(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "not_started" | "in_progress" | "completed"
  >("all");
  const [teammateFilter, setTeammateFilter] = useState<string>("all");
  const [selectedStrike, setSelectedStrike] = useState<any>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [refreshCountdown, setRefreshCountdown] = useState(0);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string | null;
  }>({
    type: null,
    message: null,
  });

  // React Query: Team details
  const { data: team, isPending: loadingTeam } = useQuery({
    queryKey: ["teamJourney", "detail", teamId],
    queryFn: () => getTeamDetails(teamId!),
    enabled: !!teamId && !userLoading,
  });

  // React Query: Membership status
  const { data: isTeamMember = false } = useQuery({
    queryKey: ["teamJourney", "membership", teamId, user?.id],
    queryFn: () => isUserTeamMember(teamId!, user!.id),
    enabled: !!teamId && !!user?.id,
  });

  // React Query: User role
  const { data: userRole = null } = useQuery({
    queryKey: ["teamJourney", "role", teamId, user?.id],
    queryFn: () => getUserTeamRole(teamId!, user!.id),
    enabled: !!teamId && !!user?.id,
  });

  // React Query: Weekly submission status
  const { data: hasSubmittedThisWeek = false } = useQuery({
    queryKey: ["teamJourney", "weeklySubmission", teamId, user?.id],
    queryFn: () => hasUserSubmittedThisWeek(user!.id, teamId!),
    enabled: !!teamId && !!user?.id && isTeamMember,
  });

  // React Query: Member submission statuses
  const { data: memberSubmissionStatus = {} } = useQuery({
    queryKey: [
      "teamJourney",
      "memberSubmissions",
      teamId,
      team?.members?.length ?? 0,
    ],
    queryFn: async () => {
      if (!team?.members || team.members.length === 0) return {};
      const statusPromises = team.members.map(async (member: any) => {
        const hasSubmitted = await hasUserSubmittedThisWeek(
          member.user_id,
          teamId!
        );
        return { userId: member.user_id, hasSubmitted };
      });
      const statuses = await Promise.all(statusPromises);
      return statuses.reduce(
        (acc: any, { userId, hasSubmitted }: any) => {
          acc[userId] = hasSubmitted;
          return acc;
        },
        {} as Record<string, boolean>
      );
    },
    enabled: !!teamId && !!team?.members && team.members.length > 0,
  });

  // React Query: Achievements dashboard (includes tasks)
  const { data: achievementData, isPending: loadingAchievements } = useQuery({
    queryKey: ["teamJourney", "achievements", teamId, user?.id],
    queryFn: async () => {
      const dashboardData = await getTeamAchievementDashboard(
        teamId!,
        user!.id
      );

      // Transform tasks
      const unifiedTasksArray = Array.isArray(dashboardData.tasks)
        ? dashboardData.tasks
        : [];
      const transformedTasks = unifiedTasksArray.map((task) => {
        const isRecurring = task.achievement_name === "Recurring Tasks";
        let finalStatus = task.progress_status || "not_started";
        let recurringStatus = null;

        if (isRecurring) {
          recurringStatus = task.recurring_status || "available";
          if (
            task.progress_status === "approved" &&
            task.is_available === false
          ) {
            finalStatus = "cooldown";
          } else {
            finalStatus = task.progress_status || "not_started";
          }
        }

        return {
          progress_id: task.progress_id,
          task_id: task.task_id,
          is_confidential: task.is_confidential || false,
          title: task.task_title,
          description:
            task.task_description ||
            (isRecurring ? "Weekly recurring task" : "Team task"),
          category: task.category || (isRecurring ? "recurring" : "general"),
          difficulty_level: task.difficulty_level || (isRecurring ? 1 : 2),
          base_xp_reward: task.base_xp_reward || (isRecurring ? 200 : 100),
          base_credits_reward:
            task.base_points_reward || (isRecurring ? 20 : 10),
          status: finalStatus,
          recurring_status: recurringStatus,
          assigned_to_user_id: task.assigned_to_user_id,
          assignee_name: task.assignee_name,
          assignee_avatar_url: task.assignee_avatar_url,
          assigned_at: task.assigned_at,
          started_at: task.started_at,
          completed_at: task.completed_at,
          is_available: task.is_available === true,
          achievement_id: task.achievement_id,
          achievement_name: task.achievement_name,
          is_recurring: isRecurring,
          cooldown_days: task.cooldown_days,
          template_code: task.template_code,
          next_available_at: task.next_available_at,
          has_active_instance: task.has_active_instance || false,
          // Extended fields for task preview (pass-through from RPC)
          detailed_instructions: task.detailed_instructions || null,
          learning_objectives: task.learning_objectives || null,
          deliverables: task.deliverables || null,
          resources: task.resources || null,
          _debug: isRecurring
            ? {
                recurring_status: task.recurring_status,
                has_active_instance: task.has_active_instance,
                latest_progress_id: task.latest_progress_id || task.progress_id,
              }
            : null,
        };
      });

      return {
        achievements: dashboardData.achievements,
        tasks: transformedTasks,
        clientMeetingsCount: dashboardData.clientMeetingsCount,
        achievementsUnlocked: dashboardData.achievementsUnlocked,
      };
    },
    enabled: !!teamId && !!user?.id,
  });

  const achievements = useMemo(() => {
    const achievementsList = achievementData?.achievements || [];
    // Sort achievements with "Idea Validation" first and "Recurring Tasks" last
    return [...achievementsList].sort((a, b) => {
      if (a.achievement_name === "Idea Validation") return -1;
      if (b.achievement_name === "Idea Validation") return 1;
      if (a.achievement_name === "Recurring Tasks") return 1;
      if (b.achievement_name === "Recurring Tasks") return -1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  }, [achievementData?.achievements]);
  const allTasks = achievementData?.tasks || [];

  // React Query: Strikes
  const { data: strikes = [] } = useQuery<any[]>({
    queryKey: ["teamJourney", "strikes", teamId],
    queryFn: async () => {
      const data = await getTeamStrikes(teamId!);
      const rawStrikes = Array.isArray(data) ? data : [];

      // Transform DB strikes to component format
      return rawStrikes.map((strike: any) => ({
        id: strike.id,
        title: strike.reason || strike.title || "Strike",
        datetime:
          strike.strike_date || strike.created_at
            ? new Date(
                strike.strike_date || strike.created_at
              ).toLocaleDateString()
            : "N/A",
        description: strike.description,
        status: strike.explanation ? "explained" : "waiting-explanation",
        action: strike.explanation ? "done" : "explain",
        userName: strike.user_name || strike.users?.name || undefined,
      }));
    },
    enabled: !!teamId,
  });

  // React Query: Weekly reports
  const { data: weeklyReportsData } = useQuery({
    queryKey: ["teamJourney", "weeklyReports", teamId],
    queryFn: async () => {
      const reportsData = await getTeamWeeklyReports(teamId!);
      const reportsArray = Array.isArray(reportsData) ? reportsData : [];

      // Calculate total clients
      const totalClients = reportsArray.reduce((total: number, report) => {
        const submissionData = report.submission_data as {
          clientsContacted?: number;
        } | null;
        const clientsContacted = Number(submissionData?.clientsContacted) || 0;
        return total + clientsContacted;
      }, 0);

      // Group reports by week
      const weeklyReportsMap = new Map();
      reportsArray.forEach((report: any) => {
        const weekKey = `${report.week_year}-${report.week_number}`;
        if (!weeklyReportsMap.has(weekKey)) {
          weeklyReportsMap.set(weekKey, {
            week_number: report.week_number,
            week_year: report.week_year,
            week_start_date: report.week_start_date,
            week_end_date: report.week_end_date,
            submissions: [],
          });
        }
        weeklyReportsMap.get(weekKey).submissions.push(report);
      });

      // Transform to UI format
      const transformedReports = Array.from(weeklyReportsMap.values())
        .sort((a, b) => {
          if (a.week_year !== b.week_year) return b.week_year - a.week_year;
          return b.week_number - a.week_number;
        })
        .map((weekData) => {
          const hasSubmissions = weekData.submissions.length > 0;
          const startDate = new Date(
            weekData.week_start_date
          ).toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
          });
          const endDate = new Date(weekData.week_end_date).toLocaleDateString(
            "en-US",
            {
              month: "2-digit",
              day: "2-digit",
            }
          );

          return {
            id: `${weekData.week_year}-${weekData.week_number}`,
            week: `Week ${weekData.week_number}`,
            dateRange: `${startDate} - ${endDate}`,
            weeklyFill: {
              avatars: weekData.submissions.map(
                (s: any) => s.users?.avatar_url || "/avatars/default.jpg"
              ),
              names: weekData.submissions.map(
                (s: any) => s.users?.name || "Unknown"
              ),
            },
            clients: weekData.submissions.reduce(
              (sum: number, s: any) =>
                sum + (Number(s.submission_data?.clientsContacted) || 0),
              0
            ),
            meetings: weekData.submissions.reduce(
              (sum: number, s: any) =>
                sum + (Number(s.submission_data?.meetingsHeld) || 0),
              0
            ),
            status: (hasSubmissions ? "complete" : "missed") as
              | "complete"
              | "missed",
            submissions: weekData.submissions,
          };
        });

      return { reports: transformedReports, totalClients };
    },
    enabled: !!teamId,
  });

  const weeklyReports = weeklyReportsData?.reports || [];

  // React Query: Team stats
  const { data: statsData } = useQuery({
    queryKey: ["teamJourney", "stats", teamId],
    queryFn: () => getTeamStatsCombined(teamId!),
    enabled: !!teamId,
  });

  // Derived: Combined team stats
  const teamStats = {
    pointsInvested: statsData?.pointsInvested || 0,
    pointsEarned: statsData?.pointsEarned || 0,
    xpEarned: statsData?.xpEarned || 0,
    clientsContacted: weeklyReportsData?.totalClients || 0,
    meetingsCount: achievementData?.clientMeetingsCount || 0,
    achievementsUnlocked: achievementData?.achievementsUnlocked || false,
  };

  const loadingState = {
    page: loadingTeam || userLoading,
    achievements: loadingAchievements,
    strikes: false,
    weeklyReports: false,
    stats: false,
    submission: false,
  };

  // Mutation: Assign task
  const assignTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      userId,
    }: {
      taskId: string;
      userId: string;
    }) => {
      await assignTaskToMember(taskId, userId, team?.id || "");

      // Notify the assigned user via secure API route
      if (userId !== user?.id) {
        const task = allTasks.find(
          (t) => t.task_id === taskId || t.progress_id === taskId
        );
        fetch("/api/notifications/task-assigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assigneeId: userId,
            taskTitle: task?.title,
            teamId: team?.id,
            teamName: team?.name,
          }),
        }).catch(console.error);
      }
    },
    onMutate: async ({ taskId, userId }) => {
      await queryClient.cancelQueries({
        queryKey: ["teamJourney", "achievements", teamId, user?.id],
      });

      const previousData = queryClient.getQueryData([
        "teamJourney",
        "achievements",
        teamId,
        user?.id,
      ]);

      const assignedMember = team?.members.find(
        (m: any) => m.user_id === userId
      );

      queryClient.setQueryData(
        ["teamJourney", "achievements", teamId, user?.id],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            tasks: old.tasks.map((task: any) =>
              task.task_id === taskId || task.progress_id === taskId
                ? {
                    ...task,
                    assigned_to_user_id: userId,
                    assignee_name: assignedMember?.users?.name || undefined,
                    assignee_avatar_url:
                      assignedMember?.users?.avatar_url || undefined,
                    assigned_at: new Date().toISOString(),
                  }
                : task
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["teamJourney", "achievements", teamId, user?.id],
          context.previousData
        );
      }
      console.error("Error assigning task:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teamJourney", "achievements", teamId, user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task", "permissions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "stats"],
      });
    },
  });

  // Mutation: Start task
  const startTaskMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      if (!team?.id || !user?.id) throw new Error("Team or user not found");

      const task = allTasks.find(
        (t) => t.progress_id === taskId || t.task_id === taskId
      );
      const isRecurringTask = task?.is_recurring === true;
      const isNewTask =
        isRecurringTask || !allTasks.find((t) => t.progress_id === taskId);
      const actualTaskId = isRecurringTask
        ? task?.task_id || taskId
        : isNewTask
          ? taskId
          : allTasks.find((t) => t.progress_id === taskId)?.task_id || taskId;

      if (isNewTask) {
        await startTaskLazy(actualTaskId, team.id, user.id, "team");
      } else {
        await startTask(taskId, user.id);
      }

      return { isNewTask, isRecurringTask, actualTaskId, task };
    },
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({
        queryKey: ["teamJourney", "achievements", teamId, user?.id],
      });

      const previousData = queryClient.getQueryData([
        "teamJourney",
        "achievements",
        teamId,
        user?.id,
      ]);

      const tempProgressId = `temp-${Date.now()}`;
      const currentMember = team?.members.find(
        (m: any) => m.user_id === user?.id
      );

      queryClient.setQueryData(
        ["teamJourney", "achievements", teamId, user?.id],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            tasks: old.tasks.map((task: any) =>
              task.progress_id === taskId || task.task_id === taskId
                ? {
                    ...task,
                    assigned_to_user_id: user?.id,
                    assignee_name:
                      currentMember?.users?.name || user?.name || "You",
                    assignee_avatar_url:
                      currentMember?.users?.avatar_url ||
                      user?.avatar_url ||
                      undefined,
                    assigned_at: new Date().toISOString(),
                    started_at: new Date().toISOString(),
                    status: "in_progress" as const,
                    progress_id: task.progress_id || tempProgressId,
                  }
                : task
            ),
          };
        }
      );

      return { previousData, tempProgressId };
    },
    onSuccess: (data, variables, context: any) => {
      setFeedback({
        type: "success",
        message: `Started: ${data.task?.title || "Task"}`,
      });
      setTimeout(() => setFeedback({ type: null, message: null }), 3000);

      // Update temp progress_id to real one for new tasks
      if (data.isNewTask) {
        setTimeout(async () => {
          try {
            const freshTasks = await getTeamTasksVisible(
              team?.id || "",
              user?.id
            );
            const freshTask = freshTasks.find(
              (t: any) =>
                t.task_id === data.actualTaskId &&
                t.assigned_to_user_id === user?.id
            );

            if (freshTask?.progress_id) {
              queryClient.setQueryData(
                ["teamJourney", "achievements", teamId, user?.id],
                (old: any) => {
                  if (!old) return old;
                  return {
                    ...old,
                    tasks: old.tasks.map((task: any) =>
                      task.progress_id === context?.tempProgressId &&
                      task.task_id === data.actualTaskId
                        ? { ...task, progress_id: freshTask.progress_id }
                        : task
                    ),
                  };
                }
              );
            }
          } catch (error) {
            // Fallback to invalidation
            queryClient.invalidateQueries({
              queryKey: ["teamJourney", "achievements", teamId, user?.id],
            });
          }
        }, 500);
      }
    },
    onError: (err, variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          ["teamJourney", "achievements", teamId, user?.id],
          context.previousData
        );
      }
      const task = allTasks.find(
        (t) =>
          t.progress_id === variables.taskId || t.task_id === variables.taskId
      );
      setFeedback({
        type: "error",
        message: `Failed to start: ${task?.title || "Task"}`,
      });
      setTimeout(() => setFeedback({ type: null, message: null }), 5000);
      console.error("Error starting task:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teamJourney", "achievements", teamId, user?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task", "permissions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "stats"],
      });
    },
  });

  // Load team data
  // Refresh achievements manually
  const handleRefreshAchievements = () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;
    const cooldownPeriod = 3000; // 3 seconds

    if (timeSinceLastRefresh < cooldownPeriod) {
      return;
    }

    setLastRefreshTime(now);
    setRefreshCountdown(3);
    queryClient.invalidateQueries({
      queryKey: ["teamJourney", "achievements", teamId, user?.id],
    });
  };

  // Handle achievement filtering
  const handleAchievementClick = (achievementId: string | null) => {
    if (!teamStats.achievementsUnlocked) return;
    setSelectedAchievementId(achievementId);
  };

  // Helper: map a raw task to its filter category
  const getTaskFilterCategory = (
    task: (typeof allTasks)[number]
  ): "not_started" | "in_progress" | "completed" => {
    const isRecurring = (task as any).is_recurring === true;

    if (isRecurring) {
      if (task.status === "cooldown") return "in_progress";
      if (task.status === "approved" && task.is_available) return "not_started";
      if (task.status === "pending_review") return "in_progress";
      if (task.status === "in_progress") return "in_progress";
      if (task.status === "rejected") return "in_progress";
      return "not_started";
    } else {
      if (task.status === "approved") return "completed";
      if (task.status === "pending_review") return "in_progress";
      if (task.status === "in_progress") return "in_progress";
      if (task.status === "rejected") return "in_progress";
      return "not_started";
    }
  };

  // Filter tasks by selected achievement, status, and teammate
  const filteredTasks = useMemo(() => {
    let tasks = allTasks;

    if (selectedAchievementId) {
      tasks = tasks.filter(
        (task) => task.achievement_id === selectedAchievementId
      );
    }

    if (statusFilter !== "all") {
      tasks = tasks.filter(
        (task) => getTaskFilterCategory(task) === statusFilter
      );
    }

    if (teammateFilter !== "all") {
      tasks = tasks.filter(
        (task) => task.assigned_to_user_id === teammateFilter
      );
    }

    return tasks;
  }, [selectedAchievementId, statusFilter, teammateFilter, allTasks]);

  // Countdown timer for refresh button
  useEffect(() => {
    if (refreshCountdown > 0) {
      const timer = setTimeout(() => {
        setRefreshCountdown(refreshCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [refreshCountdown]);

  // Handle loading and error states in the render return
  if (loadingState.page || userLoading) {
    return <TeamDetailSkeleton />;
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle className="text-muted-foreground h-10 w-10" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">Team not found</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            This team may have been removed or you don&apos;t have access.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/team-journey">Back to Products</Link>
        </Button>
      </div>
    );
  }

  // Calculate real team stats
  const actualMemberCount = team.members?.length || 0;

  // Use team XP earned from team activities only (not individual user totals)
  const totalTeamXP = teamStats.xpEarned;

  // Calculate dynamic achievement progress
  const completedAchievements = achievements.filter(
    (a) => a.status === "completed"
  ).length;
  const totalAchievements = achievements.length;
  const achievementProgress =
    totalAchievements > 0
      ? `${completedAchievements}/${totalAchievements}`
      : "0/0";

  // Use comprehensive team points earned (includes tasks, meetings, all team activities)
  const teamPointsEarned = teamStats.pointsEarned;

  // Stats cards data for this team
  const statsCards: StatsCard[] = [
    {
      title: "Total XP",
      value: totalTeamXP.toLocaleString(),
      subtitle: "From completed team activities",
      icon: Zap,
      iconColor: "text-black dark:text-white",
    },
    {
      title: "Points Earned as Team",
      value: teamPointsEarned.toLocaleString(),
      subtitle: "From completed team tasks",
      icon: CreditCard,
      iconColor: "text-black dark:text-white",
    },
    {
      title: "Total Clients",
      value: teamStats.clientsContacted.toString(),
      subtitle: "Clients contacted via weekly reports",
      icon: UserCheck,
      iconColor: "text-black dark:text-white",
    },
    {
      title: "Achievements",
      value: achievementProgress,
      subtitle: `${completedAchievements} completed`,
      icon: Trophy,
      iconColor: "text-black dark:text-white",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/team-journey">Products</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="font-medium">{team.name}</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {/* Product Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0 rounded-lg">
              {team.logo_url ? (
                <AvatarImage
                  src={team.logo_url}
                  alt={team.name}
                  className="rounded-lg object-cover"
                />
              ) : null}
              <AvatarFallback className="rounded-lg bg-[#ff78c8]/10 text-lg font-bold text-[#ff78c8]">
                {team.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <Badge
              variant={team.status === "active" ? "default" : "secondary"}
              className={
                team.status === "active"
                  ? "border-[#ff78c8]/20 bg-[#ff78c8]/10 text-[#ff78c8] hover:bg-[#ff78c8]/15"
                  : "bg-muted text-muted-foreground"
              }
            >
              {team.status === "active" ? "Active" : "Archived"}
            </Badge>
            {!isTeamMember && (
              <Badge
                variant="outline"
                className="bg-muted/50 text-muted-foreground border-border"
              >
                View Only
              </Badge>
            )}
            {isTeamMember && userRole && (
              <Badge
                variant="outline"
                className="border-[#ff78c8]/20 bg-[#ff78c8]/10 text-[#ff78c8]"
              >
                {userRole
                  .replace("_", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-lg">
            {team.description || "No description provided"}
          </p>
          {!isTeamMember && (
            <p className="rounded-md border border-[#ff78c8]/20 bg-[#ff78c8]/5 px-3 py-2 text-sm text-[#ff78c8]">
              💡 You&apos;re viewing this team as a guest. Join the team to
              participate in activities and submit reports.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            disabled={!team.website}
            asChild={!!team.website}
          >
            {team.website ? (
              <a
                href={
                  team.website.startsWith("http")
                    ? team.website
                    : `https://${team.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                Website
              </a>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                Website
              </>
            )}
          </Button>
        </div>
      </div>
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => (
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
      {/* Team & Experience and Status & Progress Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Team & Experience Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                <Users className="h-4 w-4 text-black dark:text-white" />
              </div>
              <CardTitle className="text-lg font-semibold">
                Team & Experience
              </CardTitle>
            </div>
            {isTeamMember &&
              (userRole === "founder" ||
                userRole === "co_founder" ||
                userRole === "leader") && (
                <Button
                  variant="link"
                  className="h-auto p-0 font-medium text-blue-500"
                  onClick={() => setActiveModal("teamManagement")}
                >
                  Modify Team
                </Button>
              )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Top Row - Team Size and Experience */}
            <div className="grid grid-cols-2 gap-4">
              {" "}
              {/* Team Size */}
              <div className="border-border flex items-center gap-3 rounded-md border p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                  <Users className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {actualMemberCount} People
                  </div>
                  <div className="text-muted-foreground text-xs">Team Size</div>
                </div>
              </div>
              {/* Total Experience Earned */}
              <div className="border-border flex items-center gap-3 rounded-md border p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                  <Zap className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {totalTeamXP.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Total Experience Earned
                  </div>
                </div>
              </div>
            </div>

            {/* Team Members - 2 columns */}
            <Collapsible open={showAllMembers} onOpenChange={setShowAllMembers}>
              <div className="grid grid-cols-2 gap-4">
                {team.members.slice(0, 4).map((member: any) => (
                  <div
                    key={member.user_id}
                    className="border-border group flex items-center gap-3 rounded-md border p-2"
                  >
                    <Avatar className="peer h-10 w-10 transition-transform duration-300 ease-out group-hover:scale-115">
                      <AvatarImage src={member.users?.avatar_url || ""} />
                      <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 font-bold text-white">
                        {member.users?.name
                          ? member.users.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        {member.users?.name || "Unknown User"}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {(member.users?.total_xp || 0).toLocaleString()} XP |{" "}
                        {(member.users?.total_points || 0).toLocaleString()}{" "}
                        Points
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Members (Collapsible) */}
              {team.members.length > 4 && (
                <CollapsibleContent>
                  <div className="min-h-0">
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {team.members.slice(4).map((member: any) => (
                        <div
                          key={member.user_id}
                          className="border-border group flex items-center gap-3 rounded-md border p-2"
                        >
                          <Avatar className="h-10 w-10 transition-transform duration-300 ease-out group-hover:scale-115">
                            <AvatarImage src={member.users?.avatar_url || ""} />
                            <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 font-bold text-white">
                              {member.users?.name
                                ? member.users.name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase()
                                : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="text-sm font-semibold">
                              {member.users?.name || "Unknown User"}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {(member.users?.total_xp || 0).toLocaleString()}{" "}
                              XP |{" "}
                              {(
                                member.users?.total_points || 0
                              ).toLocaleString()}{" "}
                              Points
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              )}

              {/* Show More/Less Button */}
              {team.members.length > 4 && (
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground mt-4 flex w-full items-center gap-2 text-sm"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        showAllMembers ? "rotate-180" : ""
                      }`}
                    />
                    {showAllMembers
                      ? "Show Less"
                      : `Show ${team.members.length - 4} More Member${
                          team.members.length - 4 > 1 ? "s" : ""
                        }`}
                  </Button>
                </CollapsibleTrigger>
              )}
            </Collapsible>
          </CardContent>
        </Card>

        {/* Status & Progress Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                <Trophy className="h-4 w-4 text-black dark:text-white" />
              </div>
              <CardTitle className="text-lg font-semibold">
                Status & Progress
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Top Row - Date Created and Strikes */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date Created */}
              <div className="border-border flex items-center gap-3 rounded-md border p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                  <Calendar className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {team.created_at
                      ? new Date(team.created_at).toLocaleDateString()
                      : "N/A"}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Date Created
                  </div>
                </div>
              </div>

              {/* Strikes */}
              <div className="border-border flex items-center gap-3 rounded-md border p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                  <AlertTriangle className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-sm font-semibold">
                      {team.strikes_count || 0}
                    </div>
                    <div className="text-muted-foreground text-xs">Strikes</div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, index) => (
                      <div
                        key={index}
                        className={`h-2 w-2 rounded-full ${
                          index < (team.strikes_count || 0)
                            ? "bg-red-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row - Points and Invested */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Points Earned */}
              <div className="border-border flex items-center gap-3 rounded-md border p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                  <CreditCard className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {loadingState.stats
                      ? "..."
                      : teamPointsEarned.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Total Points Earned
                  </div>
                </div>
              </div>

              {/* Total Points Invested */}
              <div className="border-border flex items-center gap-3 rounded-md border p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                  <CreditCard className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {loadingState.stats
                      ? "..."
                      : teamStats.pointsInvested.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Total Points Invested
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Report */}
            {(() => {
              const totalMembers = team.members.length;
              const submittedCount = team.members.filter(
                (member) => memberSubmissionStatus[member.user_id]
              ).length;
              const allSubmitted =
                submittedCount === totalMembers && totalMembers > 0;
              const bgColor = allSubmitted ? "bg-green-50" : "bg-red-50";
              const borderColor = allSubmitted
                ? "border-green-100"
                : "border-red-100";
              return (
                <div
                  className={`flex items-center justify-between rounded-md border p-2 ${bgColor} ${borderColor}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {team.members.map((member) => {
                        const hasSubmitted =
                          memberSubmissionStatus[member.user_id];
                        const hasStatus =
                          member.user_id in memberSubmissionStatus;
                        return (
                          <div key={member.user_id} className="relative">
                            <Avatar className="h-8 w-8 border-2 border-white">
                              <AvatarImage
                                src={member.users?.avatar_url || ""}
                              />
                              <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-xs font-bold text-white">
                                {member.users?.name
                                  ? member.users.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                  : "U"}
                              </AvatarFallback>
                            </Avatar>
                            {hasStatus && (
                              <div
                                className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white ${
                                  hasSubmitted ? "bg-green-500" : "bg-red-500"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Weekly Report</div>
                      <div className="text-muted-foreground text-xs">
                        Every member needs to fill out the weekly report
                      </div>
                    </div>
                  </div>
                  {isTeamMember && (
                    <Button
                      className="gap-2 bg-black text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setActiveModal("weeklyReport")}
                      disabled={loadingState.submission || hasSubmittedThisWeek}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {loadingState.submission
                          ? "Checking..."
                          : hasSubmittedThisWeek
                            ? "Report Submitted"
                            : "Submit Team Weekly Report"}
                      </span>
                    </Button>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
      {/* Tab Section */}
      <Tabs
        value={activeDetailTab}
        onValueChange={setActiveDetailTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger
            value="weekly-reports"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Weekly Reports
          </TabsTrigger>
          <TabsTrigger
            value="client-meetings"
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Client Meetings
          </TabsTrigger>
          <TabsTrigger value="strikes" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Strikes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="mt-6 space-y-6">
          {/* Achievements Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tasks</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRefreshAchievements}
                disabled={loadingState.achievements || refreshCountdown > 0}
              >
                <RotateCcw
                  className={`h-4 w-4 ${
                    loadingState.achievements ? "animate-spin" : ""
                  }`}
                />
                {loadingState.achievements
                  ? "Refreshing..."
                  : refreshCountdown > 0
                    ? `Wait ${refreshCountdown}s`
                    : "Refresh"}
              </Button>
              <Button variant="outline" className="gap-2" disabled>
                <ExternalLink className="h-4 w-4" />
                Read About Tasks
              </Button>
            </div>
          </div>

          {/* Client Meetings Requirement Notice */}
          {!teamStats.achievementsUnlocked && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <div className="font-medium">Tasks Locked</div>
                  <div className="mt-1 text-sm text-amber-700">
                    {isTeamMember ? (
                      <>
                        Complete at least 8 client meetings to unlock tasks.
                        Current progress: {teamStats.meetingsCount}/8 meetings
                      </>
                    ) : (
                      "This team needs to complete more client meetings to unlock tasks."
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Achievement Cards Grid */}
          {loadingState.achievements ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-lg border p-4">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <div className="flex items-start gap-2">
                    <Skeleton className="h-12 w-12 shrink-0 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-14 rounded-lg" />
                    <Skeleton className="h-14 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : achievements.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No achievements available for this team
            </div>
          ) : (
            <TooltipProvider>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {achievements.map((achievement) => (
                  <Tooltip key={achievement.achievement_id}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() =>
                          handleAchievementClick(
                            selectedAchievementId === achievement.achievement_id
                              ? null
                              : achievement.achievement_id
                          )
                        }
                        className={`transition-all duration-200 ${
                          teamStats.achievementsUnlocked
                            ? "cursor-pointer hover:scale-[1.02]"
                            : "cursor-not-allowed opacity-60"
                        }`}
                      >
                        <AchievementCard
                          title={achievement.achievement_name}
                          description={
                            !teamStats.achievementsUnlocked
                              ? isTeamMember
                                ? `Need ${
                                    8 - teamStats.meetingsCount
                                  } more client meetings`
                                : "Locked - more client meetings required"
                              : achievement.achievement_name ===
                                  "Recurring Tasks"
                                ? "Weekly recurring team tasks"
                                : selectedAchievementId ===
                                    achievement.achievement_id
                                  ? "Click to show all tasks"
                                  : "Click to filter tasks"
                          }
                          status={
                            !teamStats.achievementsUnlocked
                              ? "not-started"
                              : achievement.achievement_name ===
                                  "Recurring Tasks"
                                ? "in-progress"
                                : achievement.status === "completed"
                                  ? "finished"
                                  : achievement.status
                          }
                          points={achievement.credits_reward}
                          xp={achievement.xp_reward}
                          completedTasks={achievement.completed_tasks}
                          totalTasks={achievement.total_tasks}
                          selected={
                            teamStats.achievementsUnlocked &&
                            selectedAchievementId === achievement.achievement_id
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    {!teamStats.achievementsUnlocked && (
                      <TooltipContent>
                        <p className="text-sm">
                          {isTeamMember
                            ? `Complete ${
                                8 - teamStats.meetingsCount
                              } more client meetings to unlock achievements`
                            : "This team needs more client meetings to unlock achievements"}
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          )}

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

          {/* Task Filters */}
          {teamStats.achievementsUnlocked && (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Status:</span>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(
                      value as
                        | "all"
                        | "not_started"
                        | "in_progress"
                        | "completed"
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  Assigned to:
                </span>
                <Select
                  value={teammateFilter}
                  onValueChange={setTeammateFilter}
                >
                  <SelectTrigger className="h-8 w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {team?.members?.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.users?.name || "Unknown User"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Tasks Table */}
          {loadingState.achievements ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b px-4 py-4"
                >
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="ml-auto h-6 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              ))}
            </div>
          ) : !teamStats.achievementsUnlocked ? (
            <div className="text-muted-foreground py-8 text-center">
              <div className="mb-2">Tasks are locked</div>
              <div className="text-sm">
                {isTeamMember
                  ? `Complete ${
                      8 - teamStats.meetingsCount
                    } more client meetings to unlock tasks`
                  : "This team needs more client meetings to unlock tasks"}
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              {selectedAchievementId || statusFilter !== "all"
                ? "No tasks match the current filters"
                : "No tasks available for this team."}
            </div>
          ) : (
            <div className="space-y-4">
              {/* User feedback notifications */}
              {feedback.type === "success" && feedback.message && (
                <div className="animate-in slide-in-from-top-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    {feedback.message}
                  </span>
                </div>
              )}
              {feedback.type === "error" && feedback.message && (
                <div className="animate-in slide-in-from-top-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">
                    {feedback.message}
                  </span>
                </div>
              )}

              {/* Convert filtered tasks to TaskTableItem format */}
              <TasksTable
                isTeamMember={isTeamMember}
                currentUserId={user?.id}
                tasks={filteredTasks.map((task) => {
                  // Use actual database field to determine if task is recurring
                  const isRecurring = (task as any).is_recurring === true;
                  let status: TaskTableItem["status"] = "Not Started";
                  let action: TaskTableItem["action"] = "complete";

                  // Handle recurring task logic

                  if (isRecurring) {
                    // For recurring tasks, map based on transformed status from database
                    if (task.status === "cooldown") {
                      // Task completed and in cooldown period (transformed status)
                      status = "Cooldown";
                      action = "done";
                    } else if (
                      task.status === "approved" &&
                      task.is_available
                    ) {
                      // Task completed and cooldown ended, ready for next cycle
                      status = "Not Started";
                      action = "complete";
                    } else if (task.status === "pending_review") {
                      status = "Peer Review";
                      action = "done";
                    } else if (task.status === "in_progress") {
                      status = "In Progress";
                      action = "complete";
                    } else if (task.status === "rejected") {
                      status = "Not Accepted";
                      action = "complete";
                    } else {
                      // Not started or other states
                      status = "Not Started";
                      action = "complete";
                    }
                  } else {
                    status =
                      task.status === "approved"
                        ? "Finished"
                        : task.status === "pending_review"
                          ? "Peer Review"
                          : task.status === "in_progress"
                            ? "In Progress"
                            : task.status === "rejected"
                              ? "Not Accepted"
                              : "Not Started";
                    action = task.status === "approved" ? "done" : "complete";
                  }

                  return {
                    id: task.progress_id || task.task_id, // Use task_id for navigation when no progress
                    title: task.title,
                    description: task.description,
                    difficulty:
                      task.difficulty_level === 1
                        ? "Easy"
                        : task.difficulty_level === 2
                          ? "Medium"
                          : "Hard",
                    xp: task.base_xp_reward,
                    points: task.base_credits_reward,
                    status,
                    responsible: task.assignee_name
                      ? {
                          name: task.assignee_name,
                          avatar:
                            task.assignee_avatar_url || "/avatars/john-doe.jpg",
                          date: task.assigned_at || new Date().toISOString(),
                        }
                      : isRecurring && task.status === "Cooldown"
                        ? {
                            name: "Last completed",
                            avatar: "/avatars/john-doe.jpg",
                            date: task.completed_at || new Date().toISOString(),
                          }
                        : undefined,
                    action,
                    isAvailable: task.is_available,
                    is_confidential: task.is_confidential,
                    assignedAt: task.assigned_at,
                    completedAt: task.completed_at,
                    isRecurring,
                    cooldownHours: isRecurring
                      ? ((task as any).cooldown_days || 7) * 24 // Use actual cooldown_days from recurring task data
                      : undefined,
                    nextAvailableAt: isRecurring
                      ? (task as any).next_available_at || null // Use API data
                      : null,

                    // Debug log for cooldown display
                    ...(isRecurring ? {} : {}),
                    recurringStatus: isRecurring
                      ? (task as any).recurring_status || "available"
                      : undefined,
                    hasActiveInstance: isRecurring
                      ? (task as any).has_active_instance || false
                      : undefined,
                    // Debug info for recurring tasks
                    _debug: isRecurring
                      ? {
                          recurring_status: (task as any).recurring_status,
                          has_active_instance: (task as any)
                            .has_active_instance,
                          latest_progress_id: (task as any).latest_progress_id,
                        }
                      : undefined,
                    // Extended task details for preview modal
                    detailed_instructions:
                      (task as any).detailed_instructions || null,
                    learning_objectives:
                      (task as any).learning_objectives || null,
                    deliverables: (task as any).deliverables || null,
                    resources: (task as any).resources || null,
                  } as TaskTableItem;
                })}
                teamMembers={
                  team?.members?.map((member) => ({
                    id: member.user_id,
                    name: member.users?.name || "Unknown User",
                    avatar: member.users?.avatar_url || "/avatars/john-doe.jpg",
                  })) || []
                }
                onAssignTask={(taskId, userId) =>
                  assignTaskMutation.mutate({ taskId, userId })
                }
                onStartTask={(taskId) => startTaskMutation.mutate({ taskId })}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="weekly-reports" className="mt-6 space-y-6">
          {/* Weekly Reports Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">This Week Progress</h2>
            <Button variant="outline" className="gap-2" disabled>
              <ExternalLink className="h-4 w-4" />
              Read About Weekly Reports
            </Button>
          </div>

          {/* Weekly Reports Table */}
          {loadingState.weeklyReports ? (
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b px-4 py-4"
                >
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex -space-x-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Skeleton
                        key={j}
                        className="border-background h-8 w-8 rounded-full border-2"
                      />
                    ))}
                  </div>
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="ml-auto h-8 w-16 rounded-md" />
                </div>
              ))}
            </div>
          ) : weeklyReports.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No weekly reports found for this team yet.
            </div>
          ) : (
            <WeeklyReportsTable reports={weeklyReports} />
          )}
        </TabsContent>

        <TabsContent value="client-meetings" className="mt-6 space-y-6">
          {/* Client Meetings Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Client Meetings</h2>
            <div className="flex items-center gap-3">
              {isTeamMember && (
                <Button
                  className="gap-2 bg-black text-white hover:bg-gray-800"
                  onClick={() => setActiveModal("addMeeting")}
                >
                  <Plus className="h-4 w-4" />
                  Add Meeting
                </Button>
              )}
              <Button variant="outline" className="gap-2" disabled>
                <ExternalLink className="h-4 w-4" />
                Read About Meetings
              </Button>
            </div>
          </div>

          {/* Client Meetings Table */}
          {team && (
            <ClientMeetingsTable teamId={team.id} isTeamMember={isTeamMember} />
          )}
        </TabsContent>

        <TabsContent value="strikes" className="mt-6 space-y-6">
          {/* Strikes Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Strikes & Issues</h2>
            <Button variant="outline" className="gap-2" disabled>
              <ExternalLink className="h-4 w-4" />
              Read About Strikes
            </Button>
          </div>

          {/* Strikes Table */}
          {loadingState.strikes ? (
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b px-4 py-4"
                >
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="ml-auto h-6 w-28 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-md" />
                </div>
              ))}
            </div>
          ) : strikes.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No strikes found for this team. Great job! 🎉
            </div>
          ) : (
            <StrikesTable
              isTeamMember={isTeamMember}
              strikes={strikes}
              onExplainClick={(strike) => {
                setSelectedStrike(strike);
                setActiveModal("explainStrike");
              }}
            />
          )}
        </TabsContent>
      </Tabs>
      {/* Team Management Modal */}
      {team && userRole && (
        <TeamManagementModal
          isOpen={activeModal === "teamManagement"}
          onClose={() => setActiveModal(null)}
          team={{
            id: team.id,
            name: team.name,
            description: team.description,
            website: team.website,
            logo_url: team.logo_url,
            members: team.members.map((m) => ({
              user_id: m.user_id,
              team_role: m.team_role || "member",
              joined_at: m.joined_at || new Date().toISOString(),
              users: m.users,
            })),
          }}
          userRole={userRole}
          currentUserId={user?.id}
          onRefresh={() =>
            queryClient.invalidateQueries({
              queryKey: ["teamJourney", "detail", teamId],
            })
          }
        />
      )}
      {/* Weekly Report Modal */}
      {team && user?.id && (
        <WeeklyReportModal
          open={activeModal === "weeklyReport"}
          onOpenChange={(open) => setActiveModal(open ? "weeklyReport" : null)}
          teamId={team.id}
          userId={user.id}
          onSuccess={() => {
            // Invalidate all weekly report related queries
            queryClient.invalidateQueries({
              queryKey: ["teamJourney", "weeklySubmission", teamId, user?.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["teamJourney", "memberSubmissions", teamId],
            });
            queryClient.invalidateQueries({
              queryKey: ["teamJourney", "weeklyReports", teamId],
            });
          }}
        />
      )}
      {/* Add Client Meeting Modal */}
      {team && (
        <AddClientMeetingModal
          open={activeModal === "addMeeting"}
          onOpenChange={(open) => setActiveModal(open ? "addMeeting" : null)}
          teamId={team.id}
        />
      )}
      {/* Explain Strike Modal */}
      {team && selectedStrike && (
        <ExplainStrikeModal
          open={activeModal === "explainStrike"}
          onOpenChange={(open) => setActiveModal(open ? "explainStrike" : null)}
          strike={selectedStrike}
          teamId={team.id}
        />
      )}
    </div>
  );
}
