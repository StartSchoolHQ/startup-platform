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
import {
  ExternalLink,
  FileText,
  DollarSign,
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
} from "@/lib/database";
import { StatsCard } from "@/types/dashboard";
import { useEffect, useState, useCallback } from "react";
import { useAppContext } from "@/contexts/app-context";

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface TeamDetails {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  created_at: string;
  member_count: number | null;
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
      total_credits: number;
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

  // Extract ID from params
  useEffect(() => {
    const extractId = async () => {
      const { id } = await params;
      setTeamId(id);
    };
    extractId();
  }, [params]);

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

      setTeam(teamData);
      setIsTeamMember(membershipStatus);
      setUserRole(role);
    } catch (error) {
      console.error("Error loading team:", error);
    } finally {
      setLoading(false);
    }
  }, [teamId, user?.id]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

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

  // Stats cards data for this team
  const statsCards: StatsCard[] = [
    {
      title: "Total Revenue",
      value: "$2,131.86",
      subtitle: "+20% from last month",
      icon: DollarSign,
      iconColor: "text-green-500",
    },
    {
      title: "Clients",
      value: "2",
      subtitle: "+10% from last month",
      icon: Users,
      iconColor: "text-blue-500",
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
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-gray-100 text-gray-800"
              }
            >
              {team.status === "active" ? "Active" : "Archived"}
            </Badge>
            {!isTeamMember && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                View Only
              </Badge>
            )}
            {isTeamMember && userRole && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
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
            <p className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
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
          {isTeamMember && (
            <Button className="gap-2 bg-black text-white hover:bg-gray-800">
              <FileText className="h-4 w-4" />
              Submit Weekly Report
            </Button>
          )}
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
              {/* Team Size */}
              <div className="flex items-center gap-3 border border-gray-200 p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100">
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
              <div className="flex items-center gap-3 border border-gray-200 p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-purple-100">
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
                  className="flex items-center gap-3 border border-gray-200 p-2 rounded-md"
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
                      {(member.users?.total_credits || 0).toLocaleString()}{" "}
                      Credits
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
              <div className="flex items-center gap-3 border border-gray-200 p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100">
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
              <div className="flex items-center gap-3 border border-gray-200 p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex items-center gap-2">
                  <div>
                    <div className="font-semibold text-sm">Strikes</div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row - Points and Invested */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Points Earned */}
              <div className="flex items-center gap-3 border border-gray-200 p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-100">
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
              <div className="flex items-center gap-3 border border-gray-200 p-2 rounded-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-100">
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
            <div className="flex items-center gap-3 border border-gray-200 p-2 rounded-md">
              <div className="flex -space-x-2">
                {team.members.slice(0, 4).map((member) => (
                  <Avatar
                    key={member.user_id}
                    className="w-8 h-8 border-2 border-white"
                  >
                    <AvatarImage src={member.users?.avatar_url || ""} />
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
                ))}
              </div>
              <div>
                <div className="font-semibold text-sm">Weekly Report</div>
                <div className="text-xs text-muted-foreground">
                  Every member needs to fill out the weekly report
                </div>
              </div>
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* First Row */}
            <AchievementCard
              title="Launch Achievements"
              description="Click to unfilter"
              status="in-progress"
              points={680}
              xp={1020}
            />
            <AchievementCard
              title="Topic 2"
              description="Click to filter"
              status="finished"
              points={680}
              xp={1020}
            />
            <AchievementCard
              title="Topic 3"
              description="Click to filter"
              status="not-started"
              points={680}
              xp={1020}
            />
            <AchievementCard
              title="Topic 4"
              description="Click to filter"
              status="not-started"
              points={680}
              xp={1020}
            />

            {/* Second Row */}
            <AchievementCard
              title="Topic 5"
              description="Click to filter"
              status="not-started"
              points={680}
              xp={1020}
            />
            <AchievementCard
              title="Topic 6"
              description="Click to filter"
              status="not-started"
              points={680}
              xp={1020}
            />
            <AchievementCard
              title="Topic 7"
              description="Click to filter"
              status="not-started"
              points={680}
              xp={1020}
            />
            <AchievementCard
              title="Topic 8"
              description="Click to filter"
              status="not-started"
              points={680}
              xp={1020}
            />
          </div>

          {/* Tasks Table */}
          <TasksTable
            isTeamMember={isTeamMember}
            tasks={[
              {
                id: "1",
                title: "Launch on Product Hunt",
                description: "Launch Achievements",
                difficulty: "Easy",
                xp: 50,
                points: 25,
                action: "complete",
                hasTips: true,
              },
              {
                id: "2",
                title: "Random Task",
                description: "Launch Achievements",
                responsible: {
                  name: "John Doe",
                  avatar: "/avatars/john-doe.jpg",
                  date: "14.07",
                },
                difficulty: "Medium",
                xp: 50,
                points: 25,
                action: "done",
              },
              {
                id: "3",
                title: "Random Task",
                description: "Launch Achievements",
                difficulty: "Hard",
                xp: 50,
                points: 25,
                action: "complete",
                hasTips: true,
              },
              {
                id: "4",
                title: "Random Task",
                description: "Launch Achievements",
                difficulty: "Easy",
                xp: 50,
                points: 25,
                action: "complete",
                hasTips: true,
              },
              {
                id: "5",
                title: "Random Task",
                description: "Launch Achievements",
                difficulty: "Easy",
                xp: 50,
                points: 25,
                action: "complete",
                hasTips: true,
              },
            ]}
          />
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
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-lg bg-blue-100">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">92%</div>
              <div className="text-sm text-muted-foreground">Productivity</div>
            </Card>

            <Card className="p-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-lg bg-green-100">
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
          <WeeklyReportsTable
            reports={[
              {
                id: "1",
                week: "Week 4",
                dateRange: "01.05-07.05",
                weeklyFill: {
                  avatars: [
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                  ],
                  names: [
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                  ],
                },
                clients: 50,
                meetings: 25,
                xp: 50,
                points: 25,
                status: "complete",
              },
              {
                id: "2",
                week: "Week 3",
                dateRange: "01.05-07.05",
                weeklyFill: {
                  avatars: [
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                  ],
                  names: [
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                  ],
                },
                clients: 50,
                meetings: 25,
                xp: 50,
                points: 25,
                status: "done",
              },
              {
                id: "3",
                week: "Week 2",
                dateRange: "01.05-07.05",
                weeklyFill: {
                  avatars: [
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                  ],
                  names: [
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                  ],
                },
                clients: 50,
                meetings: 25,
                xp: 50,
                points: 25,
                status: "missed",
              },
              {
                id: "4",
                week: "Week 1",
                dateRange: "01.05-07.05",
                weeklyFill: {
                  avatars: [
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                  ],
                  names: [
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                  ],
                },
                clients: 50,
                meetings: 2,
                xp: 50,
                points: 25,
                status: "missed",
              },
              {
                id: "5",
                week: "Week 0",
                dateRange: "01.05-07.05",
                weeklyFill: {
                  avatars: [
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                    "/avatars/john-doe.jpg",
                  ],
                  names: [
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                    "Davids Petruhovs",
                  ],
                },
                clients: 50,
                meetings: 25,
                xp: 50,
                points: 25,
                status: "done",
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="client-meetings" className="space-y-6 mt-6">
          {/* Client Meetings Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Client Meetings</h2>
            <div className="flex items-center gap-3">
              {isTeamMember && (
                <Button className="gap-2 bg-black text-white hover:bg-gray-800">
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
          <ClientMeetingsTable
            meetings={[
              {
                id: "1",
                client: {
                  company: "Acme Corp",
                  type: "Initial Call",
                },
                responsible: {
                  name: "John Doe",
                  avatar: "/avatars/john-doe.jpg",
                  datetime: "2025-07-15 10:00 AM",
                },
                points: 25,
              },
              {
                id: "2",
                client: {
                  company: "Acme Corp",
                  type: "Feedback Call",
                },
                responsible: {
                  name: "John Doe",
                  avatar: "/avatars/john-doe.jpg",
                  datetime: "2025-07-15 10:00 AM",
                },
                points: 25,
              },
              {
                id: "3",
                client: {
                  company: "Acme Corp",
                  type: "Closing Call",
                },
                responsible: {
                  name: "John Doe",
                  avatar: "/avatars/john-doe.jpg",
                  datetime: "2025-07-15 10:00 AM",
                },
                points: 25,
              },
              {
                id: "4",
                client: {
                  company: "Acme Corp",
                  type: "Follow-Up Call",
                },
                responsible: {
                  name: "John Doe",
                  avatar: "/avatars/john-doe.jpg",
                  datetime: "2025-07-15 10:00 AM",
                },
                points: 25,
              },
              {
                id: "5",
                client: {
                  company: "Acme Corp",
                  type: "Initial Call",
                },
                responsible: {
                  name: "John Doe",
                  avatar: "/avatars/john-doe.jpg",
                  datetime: "2025-07-15 10:00 AM",
                },
                points: 25,
              },
            ]}
          />
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
          <StrikesTable
            isTeamMember={isTeamMember}
            strikes={[
              {
                id: "1",
                title: "Missed Weekly Meeting Submission",
                datetime: "2025-07-15 10:00 AM",
                status: "explained",
                xpPenalty: 500,
                pointsPenalty: 250,
                action: "done",
              },
              {
                id: "2",
                title: "Missed Weekly Minimum Meetings",
                datetime: "2025-07-15 10:00 AM",
                status: "waiting-explanation",
                xpPenalty: 250,
                pointsPenalty: 125,
                action: "explain",
              },
            ]}
          />
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
    </div>
  );
}
