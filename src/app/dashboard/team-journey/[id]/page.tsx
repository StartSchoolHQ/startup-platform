"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  CheckCircle,
  TrendingUp,
  UserCheck,
  MessageSquare,
  Plus,
} from "lucide-react";
import {
  getTeamDetails,
  isUserTeamMember,
  getUserTeamRole,
  getTeamStrikes,
  getTeamWeeklyReports,
  getTeamAchievements,
} from "@/lib/database";
import { StatsCard } from "@/types/dashboard";
import { useEffect, useState, useCallback } from "react";
import { useAppContext } from "@/contexts/app-context";
import { hasUserSubmittedThisWeek } from "@/lib/weekly-reports";
import { assignTaskToMember, startTask } from "@/lib/tasks";
import { getTasksByAchievement } from "@/lib/database";
import { Achievement, TaskWithAchievement } from "@/types/dashboard";

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

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { user } = useAppContext();
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
  const [filteredTasks, setFilteredTasks] = useState<TaskWithAchievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [loadingStrikes, setLoadingStrikes] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [loadingWeeklyReports, setLoadingWeeklyReports] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      if (!team?.id || !user?.id) return;

      try {
        // Find the member details for the UI update
        const assignedMember = team?.members.find((m) => m.user_id === userId);

        // Optimistically update the UI immediately
        setFilteredTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.progress_id === taskId
              ? {
                  ...task,
                  assigned_to_user_id: userId,
                  assignee_name: assignedMember?.users?.name || undefined,
                  assignee_avatar_url:
                    assignedMember?.users?.avatar_url || undefined,
                  assigned_at: new Date().toISOString(),
                }
              : task
          )
        );

        // Make the actual API call
        const success = await assignTaskToMember(taskId, userId);

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

        // Optimistically update the UI immediately
        setFilteredTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.progress_id === taskId
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
                }
              : task
          )
        );

        // Make the actual API call - this handles both assignment and starting
        const success = await startTask(taskId, user.id);

        if (!success) {
          // If it failed, revert the optimistic update
          console.error("Failed to start task - reverting");
          setRefreshTrigger((prev) => prev + 1); // Trigger reload
        }
      } catch (error) {
        console.error("Error starting task:", error);
        setRefreshTrigger((prev) => prev + 1); // Trigger reload on error
      }
    },
    [team?.id, team?.members, user?.id, user?.name, user?.avatar_url]
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
    if (!teamId) return; // Prevent DB call with null/invalid teamId
    setLoadingAchievements(true);
    try {
      // Load achievements with progress tracking and rewards divided by team member count
      const achievementsData = await getTeamAchievements(teamId);
      setAchievements(achievementsData);

      // Load all tasks for this team
      const allTasks = await getTasksByAchievement(undefined, teamId);
      const tasksArray = Array.isArray(allTasks) ? allTasks : [];

      setFilteredTasks(
        tasksArray.map((task) => ({
          progress_id: task.progress_id,
          task_id: task.task_id,
          title: task.title,
          description: task.description,
          category: task.category,
          difficulty_level: task.difficulty_level,
          base_xp_reward: task.base_xp_reward,
          base_credits_reward: task.base_points_reward,
          status: task.status,
          assigned_to_user_id: task.assigned_to_user_id,
          assignee_name: task.assignee_name,
          assignee_avatar_url: task.assignee_avatar_url,
          assigned_at: task.assigned_at,
          started_at: task.started_at,
          completed_at: task.completed_at,
          is_available: task.is_available,
          achievement_id: task.achievement_id,
          achievement_name: task.achievement_name,
        }))
      );
    } catch (error) {
      console.error("Error loading achievements:", error);
      setAchievements([]);
      setFilteredTasks([]);
    } finally {
      setLoadingAchievements(false);
    }
  }, [teamId]);

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

  // Load team weekly reports from database
  const loadWeeklyReports = useCallback(async () => {
    if (!teamId) return;

    setLoadingWeeklyReports(true);
    try {
      const reportsData = await getTeamWeeklyReports(teamId);
      const reportsArray = Array.isArray(reportsData) ? reportsData : [];

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

  // Handle achievement card click for filtering
  const handleAchievementClick = useCallback(
    async (achievementId: string | null) => {
      setSelectedAchievementId(achievementId);

      try {
        if (!teamId) return;
        const tasks = await getTasksByAchievement(
          achievementId || undefined,
          teamId as string
        );
        const tasksArray = Array.isArray(tasks) ? tasks : [];

        setFilteredTasks(
          tasksArray.map((task) => ({
            progress_id: task.progress_id,
            task_id: task.task_id,
            title: task.title,
            description: task.description,
            category: task.category,
            difficulty_level: task.difficulty_level,
            base_xp_reward: task.base_xp_reward,
            base_credits_reward: task.base_points_reward,
            status: task.status,
            assigned_to_user_id: task.assigned_to_user_id,
            assignee_name: task.assignee_name,
            assignee_avatar_url: task.assignee_avatar_url,
            assigned_at: task.assigned_at,
            started_at: task.started_at,
            completed_at: task.completed_at,
            is_available: task.is_available,
            achievement_id: task.achievement_id,
            achievement_name: task.achievement_name,
          }))
        );
      } catch (error) {
        console.error("Error filtering achievements:", error);
        setFilteredTasks([]);
      }
    },
    [teamId]
  );

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    if (isTeamMember) {
      checkWeeklyReportStatus();
    }
    if (team?.members) {
      checkAllMemberStatuses();
    }
    // Load achievements (includes tasks), strikes, and weekly reports when team is loaded
    loadAchievements();
    loadStrikes();
    loadWeeklyReports();
  }, [
    isTeamMember,
    checkWeeklyReportStatus,
    checkAllMemberStatuses,
    team?.members,
    loadAchievements,
    loadStrikes,
    loadWeeklyReports,
  ]);

  if (loading) {
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

  // Calculate total team points and XP
  const totalTeamPoints = team.members.reduce(
    (sum, member) => sum + (member.users?.total_points || 0),
    0
  );
  const totalTeamXP = team.members.reduce(
    (sum, member) => sum + (member.users?.total_xp || 0),
    0
  );

  // Stats cards data for this team
  const statsCards: StatsCard[] = [
    {
      title: "Total Points",
      value: totalTeamPoints.toLocaleString(),
      subtitle: "All team members combined",
      icon: Trophy,
      iconColor: "text-amber-500",
    },
    {
      title: "Total XP",
      value: totalTeamXP.toLocaleString(),
      subtitle: "All team members combined",
      icon: Zap,
      iconColor: "text-purple-500",
    },
    {
      title: "Achievements",
      value: "8/25",
      subtitle: "+19% from last month",
      icon: Trophy,
      iconColor: "text-yellow-500",
    },
    {
      title: "Points Earned",
      value: "9504",
      subtitle: "+201 since last hour",
      icon: Zap,
      iconColor: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/team-journey">
              Products
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
                  ? "bg-primary/10 text-primary hover:bg-primary/15"
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
                className="bg-primary/10 text-primary border-primary/20"
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
            <p className="text-sm text-primary bg-primary/5 px-3 py-2 rounded-md border border-primary/20">
              💡 You&apos;re viewing this team as a guest. Join the team to
              participate in activities and submit reports.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Website
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
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-purple-100">
                <Users className="h-4 w-4 text-purple-600" />
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
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                  <Users className="h-4 w-4 text-blue-600" />
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
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                  <Zap className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold text-sm">9,504</div>
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
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-pink-100">
                <Trophy className="h-4 w-4 text-pink-600" />
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
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                  <Calendar className="h-4 w-4 text-blue-600" />
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
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
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
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                  <CreditCard className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-sm">24040</div>
                  <div className="text-xs text-muted-foreground">
                    Total Points Earned
                  </div>
                </div>
              </div>

              {/* Total Points Invested */}
              <div className="flex items-center gap-3 border border-border p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-destructive/10">
                  <CreditCard className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <div className="font-semibold text-sm">4200</div>
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
                      <FileText className="h-4 w-4" />
                      {checkingSubmission
                        ? "Checking..."
                        : hasSubmittedThisWeek
                        ? "Report Submitted"
                        : "Submit Weekly Report"}
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
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Read About Achievements
            </Button>
          </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {achievements.map((achievement) => (
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
                    points={achievement.credits_reward}
                    xp={achievement.xp_reward}
                    selected={
                      selectedAchievementId === achievement.achievement_id
                    }
                  />
                </div>
              ))}
            </div>
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
          ) : filteredTasks.filter((t) => t.progress_id).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedAchievementId
                ? "No started tasks found for this achievement"
                : "No started tasks available for this team. Team members need to start tasks first."}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Task filtering info */}
              <div className="text-sm text-muted-foreground">
                Showing {filteredTasks.filter((t) => t.progress_id).length} task
                {filteredTasks.filter((t) => t.progress_id).length !== 1
                  ? "s"
                  : ""}
                {selectedAchievementId && (
                  <span>
                    {" "}
                    for{" "}
                    {
                      achievements.find(
                        (a) => a.achievement_id === selectedAchievementId
                      )?.achievement_name
                    }
                  </span>
                )}{" "}
                that have been started
              </div>

              {/* Convert filtered tasks to TaskTableItem format */}
              <TasksTable
                isTeamMember={isTeamMember}
                currentUserId={user?.id}
                tasks={filteredTasks
                  .filter((task) => task.progress_id) // Only show tasks that have been started (have progress_id)
                  .map((task) => ({
                    id: task.progress_id!, // Use non-null assertion since we filtered above
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
                    status:
                      task.status === "approved"
                        ? "Finished"
                        : task.status === "pending_review"
                        ? "Peer Review"
                        : task.status === "in_progress"
                        ? "In Progress"
                        : task.status === "rejected"
                        ? "Not Accepted"
                        : "Not Started",
                    responsible: task.assignee_name
                      ? {
                          name: task.assignee_name,
                          avatar:
                            task.assignee_avatar_url || "/avatars/john-doe.jpg",
                          date: task.assigned_at || new Date().toISOString(),
                        }
                      : undefined,
                    action: task.status === "approved" ? "done" : "complete",
                    isAvailable: task.is_available,
                    assignedAt: task.assigned_at,
                    completedAt: task.completed_at,
                  }))}
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
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Read About Weekly Reports
            </Button>
          </div>

          {/* This Week Progress Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">92%</div>
              <div className="text-sm text-muted-foreground">Productivity</div>
            </Card>

            <Card className="p-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-lg bg-primary/10">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">24</div>
              <div className="text-sm text-muted-foreground">
                Tasks Completed
              </div>
            </Card>

            <Card className="p-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-lg bg-purple-100">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">8</div>
              <div className="text-sm text-muted-foreground">Meetings</div>
            </Card>

            <Card className="p-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-lg bg-cyan-100">
                <UserCheck className="h-6 w-6 text-cyan-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">1</div>
              <div className="text-sm text-muted-foreground">
                Clients Acquired
              </div>
            </Card>
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
              <Button variant="outline" className="gap-2">
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
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="strikes" className="space-y-6 mt-6">
          {/* Strikes Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Strikes & Issues</h2>
            <Button variant="outline" className="gap-2">
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
            // Trigger a refresh of the client meetings table
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
