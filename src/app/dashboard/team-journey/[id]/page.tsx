"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  mapRecurringStatusToUI,
  mapUIStatusToBadge,
  getTaskAction,
  validateStatusConsistency,
  type RecurringTaskStatus,
  type UITaskStatus,
} from "@/lib/status-mapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { AchievementCard } from "@/components/my-journey/achievement-card";
import { TasksTable } from "@/components/team-journey/tasks-table";
import { WeeklyReportsTable } from "@/components/team-journey/weekly-reports-table";
import { ClientMeetingsTable } from "@/components/team-journey/client-meetings-table";
import { StrikesTable } from "@/components/team-journey/strikes-table";
import { TeamManagementModal } from "@/components/team-journey/team-management-modal";
import { WeeklyReportModal } from "@/components/weekly-reports/weekly-report-modal";
import { AddClientMeetingModal } from "@/components/team-journey/add-client-meeting-modal";
import {
  ExternalLink,
  FileText,
  Users,
  Trophy,
  Zap,
  Calendar,
  AlertTriangle,
  CreditCard,
  UserCheck,
  Plus,
  RotateCcw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getTeamDetails,
  isUserTeamMember,
  getUserTeamRole,
  getTeamStrikes,
  getTeamWeeklyReports,
  getTeamAchievements,
  getTeamTasksVisible,
  getTeamPointsInvested,
  getTeamPointsEarned,
  getTeamXPEarned,
  getTeamClientMeetings,
} from "@/lib/database";
import { StatsCard } from "@/types/dashboard";
import type { Database } from "@/types/database";
import { useEffect, useState, useCallback, use } from "react";
import { useAppContext } from "@/contexts/app-context";
import { hasUserSubmittedThisWeek } from "@/lib/weekly-reports";
import { assignTaskToMember, startTask, startTaskLazy } from "@/lib/tasks";
import { Achievement, TaskWithAchievement } from "@/types/dashboard";
import { TaskTableItem } from "@/types/team-journey";

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
  status: "active" | "archived";
  created_at: string;
  member_count: number | null;
  strikes_count?: number | null;
  members: {
    user_id: string;
    team_role: string;
    joined_at: string;
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
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showWeeklyReportModal, setShowWeeklyReportModal] = useState(false);
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [hasSubmittedThisWeek, setHasSubmittedThisWeek] = useState(false);
  const [checkingSubmission, setCheckingSubmission] = useState(true);
  const [memberSubmissionStatus, setMemberSubmissionStatus] = useState<
    Record<string, boolean>
  >({});
  const [loadingTasks] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedAchievementId, setSelectedAchievementId] = useState<
    string | null
  >(null);
  const [allTasks, setAllTasks] = useState<TaskWithAchievement[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskWithAchievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [loadingStrikes, setLoadingStrikes] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [loadingWeeklyReports, setLoadingWeeklyReports] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [teamPointsInvested, setTeamPointsInvested] = useState(0);
  const [loadingPointsInvested, setLoadingPointsInvested] = useState(false);
  const [teamPointsEarnedFromActivities, setTeamPointsEarnedFromActivities] =
    useState(0);
  const [loadingPointsEarned, setLoadingPointsEarned] = useState(false);
  const [teamXPEarned, setTeamXPEarned] = useState(0);
  // XP earned loading state removed as it's not used
  const [totalClientsContacted, setTotalClientsContacted] = useState(0);
  const [clientMeetingsCount, setClientMeetingsCount] = useState(0);
  const [achievementsUnlocked, setAchievementsUnlocked] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [refreshCountdown, setRefreshCountdown] = useState(0);
  const [taskActionSuccess, setTaskActionSuccess] = useState<string | null>(
    null
  );
  const [taskActionError, setTaskActionError] = useState<string | null>(null);

  // Extract ID from params
  useEffect(() => {
    const extractId = async () => {
      const { id } = await params;
      setTeamId(id);
    };
    extractId();
  }, [params]);

  // Handle task assignment - optimistic update
  const handleAssignTask = useCallback(
    async (taskId: string, userId: string) => {
      if (!team?.id || !user?.id) {
        console.error("Missing team ID or user ID for assignment");
        return;
      }

      console.log("Assigning task:", { taskId, userId, teamId: team.id });

      try {
        // Find the member details for the UI update
        const assignedMember = team?.members.find((m) => m.user_id === userId);

        // Optimistically update both allTasks and filteredTasks immediately
        const updateTaskAssignment = (prevTasks: TaskWithAchievement[]) =>
          prevTasks.map((task) =>
            task.progress_id === taskId || task.task_id === taskId
              ? {
                  ...task,
                  assigned_to_user_id: userId,
                  assignee_name: assignedMember?.users?.name || undefined,
                  assignee_avatar_url:
                    assignedMember?.users?.avatar_url || undefined,
                  assigned_at: new Date().toISOString(),
                }
              : task
          );

        setAllTasks(updateTaskAssignment);
        setFilteredTasks(updateTaskAssignment);

        // Make the actual API call with team ID for lazy progress creation
        const success = await assignTaskToMember(taskId, userId, team.id);

        if (!success) {
          // If it failed, revert the optimistic update
          console.error("Failed to assign task - reverting");
          setRefreshTrigger((prev) => prev + 1); // Trigger reload
        }
      } catch (error) {
        console.error("Error assigning task:", error);
        setRefreshTrigger((prev) => prev + 1); // Trigger reload on error
      }
    },
    [team?.id, team?.members, user?.id]
  );

  // Handle starting task (self-assign and start) - optimistic update
  const handleStartTask = useCallback(
    async (taskId: string) => {
      if (!team?.id || !user?.id) return;

      try {
        // Find current user details for the UI update
        const currentMember = team?.members.find((m) => m.user_id === user.id);

        // PHASE 3 UNIFIED: Check if this is a recurring task using unified data
        const task = filteredTasks.find(
          (t) => t.progress_id === taskId || t.task_id === taskId
        );
        const isRecurringTask = task?.is_recurring === true;

        // PHASE 3 UNIFIED: Handle both regular and recurring tasks with same logic
        // For recurring tasks, always use task_id for starting new instances
        // For regular tasks, use progress_id if exists, otherwise task_id
        const isNewTask =
          isRecurringTask ||
          !filteredTasks.find((t) => t.progress_id === taskId);
        const actualTaskId = isRecurringTask
          ? task?.task_id || taskId // Always use task_id for recurring tasks
          : isNewTask
          ? taskId
          : filteredTasks.find((t) => t.progress_id === taskId)?.task_id ||
            taskId;

        // Optimistically update both allTasks and filteredTasks immediately
        const updateTaskStart = (prevTasks: TaskWithAchievement[]) =>
          prevTasks.map((task) =>
            task.progress_id === taskId || task.task_id === taskId
              ? {
                  ...task,
                  assigned_to_user_id: user.id,
                  assignee_name:
                    currentMember?.users?.name || user.name || "You",
                  assignee_avatar_url:
                    currentMember?.users?.avatar_url ||
                    user.avatar_url ||
                    undefined,
                  assigned_at: new Date().toISOString(),
                  started_at: new Date().toISOString(),
                  status: "in_progress" as const,
                  progress_id: task.progress_id || `temp-${Date.now()}`, // Generate temp ID for new tasks
                }
              : task
          );

        setAllTasks(updateTaskStart);
        setFilteredTasks(updateTaskStart);

        // PHASE 3 UNIFIED: Use startTaskLazy for both regular and recurring tasks
        console.log("PHASE 3 UNIFIED: Starting task:", {
          taskId: actualTaskId,
          teamId: team.id,
          userId: user.id,
          isRecurring: isRecurringTask,
          taskTitle: task?.title,
        });

        const success = isNewTask
          ? await startTaskLazy(actualTaskId, team.id, user.id, "team")
          : await startTask(taskId, user.id);

        if (!success) {
          // If it failed, revert the optimistic update
          console.error("PHASE 3 UNIFIED: Failed to start task - reverting");
          setRefreshTrigger((prev) => prev + 1); // Trigger reload

          // Show error feedback
          setTaskActionError(`Failed to start: ${task?.title || "Task"}`);
          setTimeout(() => setTaskActionError(null), 5000);
        } else {
          // PHASE 3 UNIFIED: Success handling for both regular and recurring tasks
          console.log(
            `PHASE 3 UNIFIED: Successfully started: ${task?.title || "Task"}`
          );

          // Show success feedback
          setTaskActionSuccess(`Started: ${task?.title || "Task"}`);
          setTimeout(() => setTaskActionSuccess(null), 3000);

          // For recurring tasks, refresh data to show updated state
          if (isRecurringTask) {
            setTimeout(async () => {
              await loadAchievements();
            }, 500);
          }
        }

        if (success && isNewTask) {
          // For newly created progress entries, get the real progress_id smoothly
          setTimeout(async () => {
            try {
              // Use the existing function that handles RLS correctly
              const freshTasks = await getTeamTasksVisible(team.id, user?.id);
              const freshTask = (
                freshTasks as Database["public"]["Functions"]["get_team_tasks_visible"]["Returns"]
              ).find(
                (t) =>
                  t.task_id === actualTaskId &&
                  t.assigned_to_user_id === user.id
              );

              if (freshTask?.progress_id) {
                // Smoothly update just this task's progress_id in both states
                const updateProgressId = (prevTasks: TaskWithAchievement[]) =>
                  prevTasks.map((task) =>
                    task.progress_id &&
                    task.progress_id.startsWith("temp-") &&
                    task.task_id === actualTaskId
                      ? { ...task, progress_id: freshTask.progress_id }
                      : task
                  );

                setAllTasks(updateProgressId);
                setFilteredTasks(updateProgressId);
              }
            } catch (error) {
              console.error("Error fetching real progress_id:", error);
              // Fallback to full reload if targeted update fails
              setRefreshTrigger((prev) => prev + 1);
            }
          }, 500);
        }
      } catch (error) {
        console.error("Error starting task:", error);

        // Show error feedback
        const errorMessage =
          error instanceof Error ? error.message : "Failed to start task";
        setTaskActionError(errorMessage);
        setTimeout(() => setTaskActionError(null), 5000);

        // Revert optimistic updates on failure
        setRefreshTrigger((prev) => prev + 1);
      }
    },
    [
      team?.id,
      team?.members,
      user?.id,
      user?.name,
      user?.avatar_url,
      filteredTasks,
    ]
  );

  // Load team data
  const loadTeam = useCallback(async () => {
    if (!teamId || !user?.id) return;

    setLoading(true);
    try {
      const [teamData, membershipStatus, role] = await Promise.all([
        getTeamDetails(teamId),
        isUserTeamMember(teamId, user.id),
        getUserTeamRole(teamId, user.id),
      ]);

      setTeam(teamData as unknown as TeamDetails);
      setIsTeamMember(membershipStatus);
      setUserRole(role);
    } catch (error) {
      console.error("Error loading team:", error);
    } finally {
      setLoading(false);
    }
  }, [teamId, user?.id]);

  // Check weekly report submission status
  const checkWeeklyReportStatus = useCallback(async () => {
    if (!teamId || !user?.id) return;

    setCheckingSubmission(true);
    try {
      const hasSubmitted = await hasUserSubmittedThisWeek(user.id, teamId);
      setHasSubmittedThisWeek(hasSubmitted);
    } catch (error) {
      console.error("Error checking weekly report status:", error);
    } finally {
      setCheckingSubmission(false);
    }
  }, [teamId, user?.id]);

  // Check all team members' submission statuses
  const checkAllMemberStatuses = useCallback(async () => {
    if (!teamId || !team?.members) return;

    try {
      const statusPromises = team.members.map(async (member) => {
        const hasSubmitted = await hasUserSubmittedThisWeek(
          member.user_id,
          teamId
        );
        return { userId: member.user_id, hasSubmitted };
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap = statuses.reduce((acc, { userId, hasSubmitted }) => {
        acc[userId] = hasSubmitted;
        return acc;
      }, {} as Record<string, boolean>);

      setMemberSubmissionStatus(statusMap);
    } catch (error) {
      console.error("Error checking member submission statuses:", error);
    }
  }, [teamId, team?.members]);

  // Load team achievements from database
  const loadAchievements = useCallback(async () => {
    if (!teamId || !user?.id) return; // Prevent DB call with null/invalid teamId or user
    setLoadingAchievements(true);
    try {
      // First, check client meetings count to determine if achievements should be unlocked
      const clientMeetings = await getTeamClientMeetings(teamId, user.id);
      const meetingsCount = clientMeetings.length;
      setClientMeetingsCount(meetingsCount);

      // Achievements are unlocked only if team has 8+ client meetings
      const unlocked = meetingsCount >= 8;
      setAchievementsUnlocked(unlocked);

      // Load achievements with progress tracking and rewards divided by team member count
      const achievementsData = await getTeamAchievements(teamId);
      setAchievements(achievementsData);

      // PHASE 1 UNIFIED: Use enhanced visible tasks with built-in recurring metadata
      const allTasksData = await getTeamTasksVisible(teamId, user?.id);
      const unifiedTasksArray = Array.isArray(allTasksData) ? allTasksData : [];

      console.log("BRILLIANT RESET: Tasks loaded with auto-reset:", {
        total: unifiedTasksArray.length,
        recurring: unifiedTasksArray.filter((t) => t.is_recurring).length,
        regular: unifiedTasksArray.filter((t) => !t.is_recurring).length,
      });

      // Debug: Check for confidential tasks
      console.log(
        "Team tasks data:",
        unifiedTasksArray
          .filter((t) => t.is_confidential)
          .map((t) => ({
            id: t.task_id,
            title: t.task_title,
            confidential: t.is_confidential,
          }))
      );

      // PHASE 1 UNIFIED: Transform unified tasks (no need to separate regular vs recurring)
      const transformedTasks = unifiedTasksArray.map((task) => {
        // Handle both regular and recurring tasks in unified way
        // Since get_team_tasks_visible doesn't return is_recurring, identify by achievement_name
        const isRecurring = task.achievement_name === "Recurring Tasks";

        // Debug log for recurring tasks specifically
        if (task.task_title === "Weekly Team Meetings") {
          console.log("DEBUG: Weekly Team Meetings detection:", {
            task_id: task.task_id,
            title: task.task_title,
            achievement_name: task.achievement_name,
            isRecurring: isRecurring,
            progress_status: task.progress_status,
            is_available: task.is_available,
            next_available_at: task.next_available_at,
          });
        }

        // BRILLIANT RESET: Simple status handling - database auto-resets tasks
        // But we need special handling for recurring task cooldown display
        let finalStatus = task.progress_status || "not_started";
        let recurringStatus = null;

        // For recurring tasks, check if they're in cooldown
        if (isRecurring) {
          recurringStatus = task.recurring_status || "available";

          // If task is approved but not available, it's in cooldown
          if (
            task.progress_status === "approved" &&
            task.is_available === false
          ) {
            finalStatus = "cooldown";
          } else {
            // Otherwise use the database status
            finalStatus = task.progress_status || "not_started";
          }

          // Debug log for status mapping
          if (task.task_title === "Weekly Team Meetings") {
            console.log("DEBUG: Status mapping result:", {
              original_progress_status: task.progress_status,
              is_available: task.is_available,
              mapped_finalStatus: finalStatus,
              recurringStatus: recurringStatus,
            });
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
          // Enhanced recurring fields (now available for all tasks)
          cooldown_days: task.cooldown_days,
          template_code: task.template_code,
          next_available_at: task.next_available_at,
          has_active_instance: task.has_active_instance || false,
          // Debug info for recurring tasks
          _debug: isRecurring
            ? {
                recurring_status: task.recurring_status,
                has_active_instance: task.has_active_instance,
                latest_progress_id: task.latest_progress_id || task.progress_id,
              }
            : null,
        };
      });

      // BRILLIANT RESET: Simplified validation - database handles consistency
      const validateTaskData = (task: any) => {
        const issues = [];

        // Check for missing required fields only
        if (!task.task_id) issues.push(`task missing task_id`);
        if (!task.title) issues.push(`task missing title`);

        // No complex recurring validation needed - reset approach handles it!

        if (issues.length > 0) {
          console.warn(
            `Task data validation issues for ${task.title}:`,
            issues
          );
        }

        return issues.length === 0;
      };

      // Validate all unified tasks
      const validTasks = transformedTasks.filter(validateTaskData);

      // Log validation results
      if (transformedTasks.length !== validTasks.length) {
        console.warn(
          `PHASE 1 UNIFIED: Filtered out ${
            transformedTasks.length - validTasks.length
          } invalid tasks`
        );
      }

      console.log("BRILLIANT RESET: Clean, validated tasks:", {
        total: validTasks.length,
        recurring: validTasks.filter((t) => t.is_recurring).length,
        regular: validTasks.filter((t) => !t.is_recurring).length,
      });

      const allTasksCombined = validTasks;
      setAllTasks(allTasksCombined);
      // Don't set filteredTasks here - let useEffect handle filtering based on selectedAchievementId
    } catch (error) {
      console.error("Error loading achievements:", error);
      setAchievements([]);
      setAllTasks([]); // Clear allTasks on error - filteredTasks will be updated by useEffect
    } finally {
      setLoadingAchievements(false);
    }
  }, [teamId, user?.id]);

  // Load team strikes from database
  const loadStrikes = useCallback(async () => {
    if (!teamId) return;

    setLoadingStrikes(true);
    try {
      const strikesData = await getTeamStrikes(teamId);
      const strikesArray = Array.isArray(strikesData) ? strikesData : [];

      // Transform database strikes to UI format
      setStrikes(
        strikesArray.map((strike) => ({
          id: strike.id,
          title: strike.reason || "Strike",
          datetime: new Date(
            strike.strike_date || strike.created_at
          ).toLocaleString(),
          status: strike.explanation
            ? "explained"
            : ("waiting-explanation" as const),
          xpPenalty: 0, // Will be updated when we add penalties to the database
          pointsPenalty: 0, // Will be updated when we add penalties to the database
          action: strike.explanation ? "done" : ("explain" as const),
        }))
      );
    } catch (error) {
      console.error("Error loading strikes:", error);
      setStrikes([]);
    } finally {
      setLoadingStrikes(false);
    }
  }, [teamId]);

  // Load team points invested from database
  const loadTeamPointsInvested = useCallback(async () => {
    if (!teamId) return;

    setLoadingPointsInvested(true);
    try {
      const pointsInvested = await getTeamPointsInvested(teamId);
      setTeamPointsInvested(pointsInvested);
    } catch (error) {
      console.error("Error loading team points invested:", error);
      setTeamPointsInvested(0);
    } finally {
      setLoadingPointsInvested(false);
    }
  }, [teamId]);

  // Load team points earned from all activities (tasks, meetings, etc.)
  const loadTeamPointsEarned = useCallback(async () => {
    if (!teamId) return;

    setLoadingPointsEarned(true);
    try {
      const pointsEarned = await getTeamPointsEarned(teamId);
      setTeamPointsEarnedFromActivities(pointsEarned);
    } catch (error) {
      console.error("Error loading team points earned:", error);
      setTeamPointsEarnedFromActivities(0);
    } finally {
      setLoadingPointsEarned(false);
    }
  }, [teamId]);

  // Load team XP earned from all activities (tasks, meetings, etc.)
  const loadTeamXPEarned = useCallback(async () => {
    if (!teamId) return;

    try {
      const xpEarned = await getTeamXPEarned(teamId);
      setTeamXPEarned(xpEarned);
    } catch (error) {
      console.error("Error loading team XP earned:", error);
      setTeamXPEarned(0);
    }
  }, [teamId]);

  // Load team weekly reports from database
  const loadWeeklyReports = useCallback(async () => {
    if (!teamId) return;

    setLoadingWeeklyReports(true);
    try {
      const reportsData = await getTeamWeeklyReports(teamId);
      const reportsArray = Array.isArray(reportsData) ? reportsData : [];

      // Calculate total clients contacted across all weekly reports
      const totalClients = reportsArray.reduce((total: number, report) => {
        const submissionData = report.submission_data as {
          clientsContacted?: number;
        } | null;
        const clientsContacted = Number(submissionData?.clientsContacted) || 0;
        return total + clientsContacted;
      }, 0);
      setTotalClientsContacted(totalClients);

      // Group reports by week to show team submission status
      const weeklyReportsMap = new Map();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            dateRange: `${startDate}-${endDate}`,
            weeklyFill: {
              avatars: weekData.submissions.map(
                (sub: WeeklyReportSubmission) =>
                  sub.users?.avatar_url || "/avatars/john-doe.jpg"
              ),
              names: weekData.submissions.map(
                (sub: WeeklyReportSubmission) =>
                  sub.users?.name || "Unknown User"
              ),
            },
            clients: weekData.submissions.reduce(
              (
                total: number,
                sub: { submission_data?: { clientsContacted?: number } }
              ) => {
                return total + (sub.submission_data?.clientsContacted || 0);
              },
              0
            ),
            meetings: weekData.submissions.reduce(
              (
                total: number,
                sub: { submission_data?: { meetingsHeld?: number } }
              ) => {
                return total + (sub.submission_data?.meetingsHeld || 0);
              },
              0
            ),
            status: (hasSubmissions
              ? "done"
              : "missed") as WeeklyReport["status"],
            submissions: weekData.submissions,
          };
        });

      setWeeklyReports(transformedReports);
    } catch (error) {
      console.error("Error loading weekly reports:", error);
      setWeeklyReports([]);
    } finally {
      setLoadingWeeklyReports(false);
    }
  }, [teamId]);

  // Handle achievement card click for filtering - client-side only
  const handleAchievementClick = useCallback(
    (achievementId: string | null) => {
      // Only allow achievement clicks if achievements are unlocked (8+ client meetings)
      if (!achievementsUnlocked) return;

      setSelectedAchievementId(achievementId);
      // Filtering will be handled by useEffect below
    },
    [achievementsUnlocked]
  );

  // Handle refresh with cooldown protection
  const handleRefreshAchievements = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;
    const cooldownPeriod = 3000; // 3 seconds

    // Prevent spam clicking - require 3 second gap between refreshes
    if (timeSinceLastRefresh < cooldownPeriod) {
      return;
    }

    setLastRefreshTime(now);
    setRefreshCountdown(3); // Start 3 second countdown
    loadAchievements();
  }, [lastRefreshTime, setLastRefreshTime, loadAchievements]);

  // Countdown timer effect
  useEffect(() => {
    if (refreshCountdown > 0) {
      const timer = setTimeout(() => {
        setRefreshCountdown(refreshCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [refreshCountdown]);

  useEffect(() => {
    if (!userLoading) {
      loadTeam();
    }
  }, [loadTeam, userLoading]);

  // Client-side filtering effect
  useEffect(() => {
    if (selectedAchievementId) {
      const filtered = allTasks.filter(
        (task) => task.achievement_id === selectedAchievementId
      );
      setFilteredTasks(filtered);
    } else {
      setFilteredTasks(allTasks);
    }
  }, [selectedAchievementId, allTasks]);

  useEffect(() => {
    if (isTeamMember) {
      checkWeeklyReportStatus();
    }
    if (team?.members) {
      checkAllMemberStatuses();
    }
    // Load achievements (includes tasks), strikes, weekly reports, and points when team is loaded
    loadAchievements();
    loadStrikes();
    loadWeeklyReports();
    loadTeamPointsInvested();
    loadTeamPointsEarned();
    loadTeamXPEarned();
  }, [
    isTeamMember,
    checkWeeklyReportStatus,
    checkAllMemberStatuses,
    team?.members,
    loadAchievements,
    loadStrikes,
    loadWeeklyReports,
    loadTeamPointsInvested,
    loadTeamPointsEarned,
    loadTeamXPEarned,
  ]);

  // Handle loading and error states in the render return
  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!team) {
    return <div>Team not found</div>;
  }

  // Calculate real team stats
  const actualMemberCount = team.members?.length || 0;

  // Use team XP earned from team activities only (not individual user totals)
  const totalTeamXP = teamXPEarned;

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
  const teamPointsEarned = teamPointsEarnedFromActivities;

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
      value: totalClientsContacted.toString(),
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
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <Badge
              variant={team.status === "active" ? "default" : "secondary"}
              className={
                team.status === "active"
                  ? "bg-[#ff78c8]/10 text-[#ff78c8] hover:bg-[#ff78c8]/15 border-[#ff78c8]/20"
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
                className="bg-[#ff78c8]/10 text-[#ff78c8] border-[#ff78c8]/20"
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
            <p className="text-sm text-[#ff78c8] bg-[#ff78c8]/5 px-3 py-2 rounded-md border border-[#ff78c8]/20">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team & Experience Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800">
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
                  className="text-blue-500 p-0 h-auto font-medium"
                  onClick={() => setShowTeamManagement(true)}
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
              <div className="flex items-center gap-3 border border-border p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800">
                  <Users className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {actualMemberCount} People
                  </div>
                  <div className="text-xs text-muted-foreground">Team Size</div>
                </div>
              </div>
              {/* Total Experience Earned */}
              <div className="flex items-center gap-3 border border-border p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800">
                  <Zap className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {totalTeamXP.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Experience Earned
                  </div>
                </div>
              </div>
            </div>

            {/* Team Members - 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              {team.members.slice(0, 4).map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 border border-border p-2 rounded-md"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.users?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold">
                      {member.users?.name
                        ? member.users.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">
                      {member.users?.name || "Unknown User"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(member.users?.total_xp || 0).toLocaleString()} XP |{" "}
                      {(member.users?.total_points || 0).toLocaleString()}{" "}
                      Points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status & Progress Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800">
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
              <div className="flex items-center gap-3 border border-border p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800">
                  <Calendar className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {new Date(team.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Date Created
                  </div>
                </div>
              </div>

              {/* Strikes */}
              <div className="flex items-center gap-3 border border-border p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800">
                  <AlertTriangle className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <div>
                    <div className="font-semibold text-sm">
                      {team.strikes_count || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Strikes</div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
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
              <div className="flex items-center gap-3 border border-border p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800">
                  <CreditCard className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {loadingPointsEarned
                      ? "..."
                      : teamPointsEarned.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Points Earned
                  </div>
                </div>
              </div>

              {/* Total Points Invested */}
              <div className="flex items-center gap-3 border border-border p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800">
                  <CreditCard className="h-4 w-4 text-black dark:text-white" />
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {loadingPointsInvested
                      ? "..."
                      : teamPointsInvested.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
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
                  className={`flex items-center justify-between border p-2 rounded-md ${bgColor} ${borderColor}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 4).map((member) => {
                        const hasSubmitted =
                          memberSubmissionStatus[member.user_id];
                        const hasStatus =
                          member.user_id in memberSubmissionStatus;
                        return (
                          <div key={member.user_id} className="relative">
                            <Avatar className="w-8 h-8 border-2 border-white">
                              <AvatarImage
                                src={member.users?.avatar_url || ""}
                              />
                              <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
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
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                  hasSubmitted ? "bg-green-500" : "bg-red-500"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Weekly Report</div>
                      <div className="text-xs text-muted-foreground">
                        Every member needs to fill out the weekly report
                      </div>
                    </div>
                  </div>
                  {isTeamMember && (
                    <Button
                      className="gap-2 bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setShowWeeklyReportModal(true)}
                      disabled={checkingSubmission || hasSubmittedThisWeek}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {checkingSubmission
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
      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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

        <TabsContent value="achievements" className="space-y-6 mt-6">
          {/* Achievements Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Achievements</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRefreshAchievements}
                disabled={loadingAchievements || refreshCountdown > 0}
              >
                <RotateCcw
                  className={`h-4 w-4 ${
                    loadingAchievements ? "animate-spin" : ""
                  }`}
                />
                {loadingAchievements
                  ? "Refreshing..."
                  : refreshCountdown > 0
                  ? `Wait ${refreshCountdown}s`
                  : "Refresh"}
              </Button>
              <Button variant="outline" className="gap-2" disabled>
                <ExternalLink className="h-4 w-4" />
                Read About Achievements
              </Button>
            </div>
          </div>

          {/* Client Meetings Requirement Notice */}
          {!achievementsUnlocked && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <div className="font-medium">Achievements Locked</div>
                  <div className="text-sm text-amber-700 mt-1">
                    {isTeamMember ? (
                      <>
                        Complete at least 8 client meetings to unlock
                        achievements and tasks. Current progress:{" "}
                        {clientMeetingsCount}/8 meetings
                      </>
                    ) : (
                      "This team needs to complete more client meetings to unlock achievements and tasks."
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Achievement Cards Grid */}
          {loadingAchievements ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading achievements...</div>
            </div>
          ) : achievements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No achievements available for this team
            </div>
          ) : (
            <TooltipProvider>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                          achievementsUnlocked
                            ? "cursor-pointer hover:scale-[1.02]"
                            : "cursor-not-allowed opacity-60"
                        }`}
                      >
                        <AchievementCard
                          title={achievement.achievement_name}
                          description={
                            !achievementsUnlocked
                              ? isTeamMember
                                ? `Need ${
                                    8 - clientMeetingsCount
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
                            !achievementsUnlocked
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
                          selected={
                            achievementsUnlocked &&
                            selectedAchievementId === achievement.achievement_id
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    {!achievementsUnlocked && (
                      <TooltipContent>
                        <p className="text-sm">
                          {isTeamMember
                            ? `Complete ${
                                8 - clientMeetingsCount
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
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
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
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Show All Tasks
                </button>
              </div>
            </div>
          )}

          {/* Tasks Table */}
          {loadingTasks || loadingAchievements ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading tasks...</div>
            </div>
          ) : !achievementsUnlocked ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-2">Tasks are locked</div>
              <div className="text-sm">
                {isTeamMember
                  ? `Complete ${
                      8 - clientMeetingsCount
                    } more client meetings to unlock tasks`
                  : "This team needs more client meetings to unlock tasks"}
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedAchievementId
                ? "No tasks found for this achievement"
                : "No tasks available for this team."}
            </div>
          ) : (
            <div className="space-y-4">
              {/* User feedback notifications */}
              {taskActionSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 animate-in slide-in-from-top-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    {taskActionSuccess}
                  </span>
                </div>
              )}
              {taskActionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 animate-in slide-in-from-top-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">
                    {taskActionError}
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
                    // DEBUG: Log the actual values for Weekly Team Meetings
                    if (task.title === "Weekly Team Meetings") {
                      console.log("DEBUG: Weekly Team Meetings mapping:", {
                        task_status: task.status,
                        is_available: task.is_available,
                        should_be_cooldown: task.status === "cooldown",
                      });
                    }

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
                    ...((isRecurring &&
                      task.title?.toLowerCase().includes("weekly") &&
                      console.log("UI MAPPING: Recurring task cooldown data:", {
                        title: task.title,
                        progress_status: task.status,
                        recurring_status: (task as any).recurring_status,
                        mapped_ui_status: status,
                        cooldown_days: (task as any).cooldown_days,
                        cooldownHours: ((task as any).cooldown_days || 7) * 24,
                        next_available_at: (task as any).next_available_at,
                        completed_at: task.completed_at,
                        has_active_instance: (task as any).has_active_instance,
                      })) ||
                      {}),
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
                  } as TaskTableItem;
                })}
                teamMembers={
                  team?.members?.map((member) => ({
                    id: member.user_id,
                    name: member.users?.name || "Unknown User",
                    avatar: member.users?.avatar_url || "/avatars/john-doe.jpg",
                  })) || []
                }
                onAssignTask={handleAssignTask}
                onStartTask={handleStartTask}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="weekly-reports" className="space-y-6 mt-6">
          {/* Weekly Reports Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">This Week Progress</h2>
            <Button variant="outline" className="gap-2" disabled>
              <ExternalLink className="h-4 w-4" />
              Read About Weekly Reports
            </Button>
          </div>

          {/* Weekly Reports Table */}
          {loadingWeeklyReports ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading weekly reports...</div>
            </div>
          ) : weeklyReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No weekly reports found for this team yet.
            </div>
          ) : (
            <WeeklyReportsTable reports={weeklyReports} />
          )}
        </TabsContent>

        <TabsContent value="client-meetings" className="space-y-6 mt-6">
          {/* Client Meetings Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Client Meetings</h2>
            <div className="flex items-center gap-3">
              {isTeamMember && (
                <Button
                  className="gap-2 bg-black text-white hover:bg-gray-800"
                  onClick={() => setShowAddMeetingModal(true)}
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
            <ClientMeetingsTable
              key={refreshTrigger}
              teamId={team.id}
              isTeamMember={isTeamMember}
              onDataChange={() => {
                // Refresh any dependent data when meetings change
                loadWeeklyReports(); // This will refresh weekly reports if needed
                loadTeamPointsEarned(); // Refresh points earned to include meeting rewards
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="strikes" className="space-y-6 mt-6">
          {/* Strikes Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Strikes & Issues</h2>
            <Button variant="outline" className="gap-2" disabled>
              <ExternalLink className="h-4 w-4" />
              Read About Strikes
            </Button>
          </div>

          {/* Strikes Table */}
          {loadingStrikes ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading strikes...</div>
            </div>
          ) : strikes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No strikes found for this team. Great job! 🎉
            </div>
          ) : (
            <StrikesTable isTeamMember={isTeamMember} strikes={strikes} />
          )}
        </TabsContent>
      </Tabs>
      {/* Team Management Modal */}
      {team && userRole && (
        <TeamManagementModal
          isOpen={showTeamManagement}
          onClose={() => setShowTeamManagement(false)}
          team={team}
          userRole={userRole}
          currentUserId={user?.id}
          onRefresh={loadTeam}
        />
      )}
      {/* Weekly Report Modal */}
      {team && user?.id && (
        <WeeklyReportModal
          open={showWeeklyReportModal}
          onOpenChange={setShowWeeklyReportModal}
          teamId={team.id}
          userId={user.id}
          onSuccess={async () => {
            // Refresh both user's submission status, all member statuses, and weekly reports data
            try {
              await Promise.all([
                checkWeeklyReportStatus(),
                checkAllMemberStatuses(),
                loadWeeklyReports(),
              ]);
            } catch (error) {
              console.error("Error refreshing weekly report status:", error);
            }
          }}
        />
      )}
      {/* Add Client Meeting Modal */}
      {team && (
        <AddClientMeetingModal
          open={showAddMeetingModal}
          onOpenChange={setShowAddMeetingModal}
          teamId={team.id}
          onSuccess={() => {
            // Trigger a refresh of the client meetings table and points earned
            setRefreshTrigger((prev) => prev + 1);
            loadTeamPointsEarned(); // Refresh points to include new meeting rewards
          }}
        />
      )}
    </div>
  );
}
