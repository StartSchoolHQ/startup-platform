"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle2,
  Zap,
  CreditCard,
  Target,
  CheckCircle,
  Building2,
  AlertCircle,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { TeamItem, StatItem } from "@/components/dashboard/dashboard-items";
import { IconContainer } from "@/components/dashboard/icon-container";
import { StatsGridSkeleton } from "@/components/ui/stats-grid-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
// WhatsNextCard hidden temporarily — uncomment to re-enable
// import { WhatsNextCard } from "@/components/dashboard/whats-next-card";
// Onborda disabled temporarily — uncomment to re-enable
// import { DashboardTourTrigger } from "@/components/onboarding/dashboard-tour-trigger";
import { useMemo } from "react";
import { StatsCard, TeamProgressData } from "@/types/dashboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export default function OverviewPage() {
  const { firstName, user } = useApp();
  const queryClient = useQueryClient();

  // React Query: Consolidated dashboard overview (single RPC call)
  const {
    data: dashboardOverview,
    isPending: isLoadingOverview,
    isError: isOverviewError,
  } = useQuery({
    queryKey: ["dashboard", "overview", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "get_dashboard_overview",
        { p_user_id: user!.id }
      );
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Derive stats cards from the consolidated overview response
  const statsCards: StatsCard[] = useMemo(() => {
    if (!dashboardOverview) return [];
    return [
      {
        id: "onborda-xp-balance",
        title: "XP Balance",
        value: (dashboardOverview.total_xp ?? 0).toString(),
        subtitle: "Total experience points",
        icon: Zap,
        iconColor: "text-amber-500",
        href: "/dashboard/transaction-history",
      },
      {
        id: "onborda-points-balance",
        title: "Points Balance",
        value: (dashboardOverview.total_points ?? 0).toString(),
        subtitle: "Available startup capital",
        icon: CreditCard,
        iconColor: "text-emerald-500",
        href: "/dashboard/transaction-history",
      },
      {
        id: "onborda-achievements",
        title: "Achievements",
        value: `${dashboardOverview.completed_achievements ?? 0}/${dashboardOverview.total_achievements ?? 0}`,
        subtitle: "Team achievements unlocked",
        icon: Target,
        iconColor: "text-purple-500",
        href: "/dashboard/team-journey",
      },
      {
        id: "onborda-tasks",
        title: "Tasks",
        value: `${dashboardOverview.completed_tasks ?? 0}/${dashboardOverview.total_tasks ?? 0}`,
        subtitle: "Team tasks completed",
        icon: CheckCircle,
        iconColor: "text-blue-500",
        href: "/dashboard/team-journey",
      },
    ];
  }, [dashboardOverview]);

  // Derive team progress data from the consolidated overview response
  const teamProgressData: TeamProgressData | null = useMemo(() => {
    if (!dashboardOverview) return null;

    const teamsRaw = dashboardOverview.teams_data ?? [];
    const hasTeams = teamsRaw.length > 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teams = teamsRaw.map((t: any) => ({
      id: t.team_id,
      name: t.team_name,
      memberCount: t.member_count ?? 0,
      completedTasks: t.completed_tasks ?? 0,
      totalXP: t.team_xp ?? 0,
      totalPoints: t.team_points ?? 0,
    }));

    // Aggregate stats only shown when user belongs to multiple teams
    const stats =
      hasTeams && teams.length > 1
        ? [
            {
              value: teams
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .reduce((sum: number, t: any) => sum + (t.totalPoints ?? 0), 0)
                .toString(),
              label: "Total Team Points",
              icon: CreditCard,
              iconColor: "text-black",
            },
            {
              value: teams
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .reduce((sum: number, t: any) => sum + (t.totalXP ?? 0), 0)
                .toString(),
              label: "Total Team XP",
              icon: Zap,
              iconColor: "text-black",
            },
          ]
        : [];

    return {
      title: "Your Teams Progress",
      joinTeamsText: "View Teams",
      hasTeams,
      stats,
      teams,
    };
  }, [dashboardOverview]);

  // React Query: Action items from RPC
  const { data: actionItems } = useQuery({
    queryKey: ["dashboard", "actionItems", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "get_dashboard_action_items",
        { p_user_id: user!.id }
      );
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // WhatsNextCard hidden — uncomment queries below when re-enabling
  // const { data: hasSubmittedThisWeek = false, isPending: isLoadingSubmission } = useQuery({...});
  // const { data: pendingTasks = [] } = useQuery({...});

  const loading = isLoadingOverview;
  const hasError = isOverviewError;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Hi {firstName} 👋</h1>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
        <StatsGridSkeleton />
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Hi {firstName} 👋</h1>
          <p className="text-muted-foreground">
            Here you can see progress for you and your team
          </p>
        </div>
        <Card className="border-red-500/20">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="text-muted-foreground mb-3 h-10 w-10" />
            <p className="text-muted-foreground mb-4 text-sm">
              Failed to load dashboard data. Please try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["dashboard"] })
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <DashboardTourTrigger /> */}
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold">Hi {firstName} 👋</h1>
        <p className="text-muted-foreground">
          Here you can see progress for you and your team
        </p>

        {/* Leaderboard rank badge */}
        {actionItems && actionItems.leaderboard_rank > 0 && (
          <Link
            href="/dashboard/leaderboard"
            className="text-muted-foreground hover:text-foreground mt-2 inline-flex items-center gap-2 text-sm transition-colors"
          >
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>
              Ranked <strong>#{actionItems.leaderboard_rank}</strong> of{" "}
              {actionItems.leaderboard_total_users}
            </span>
            {actionItems.leaderboard_xp_change > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{actionItems.leaderboard_xp_change} XP this week
              </Badge>
            )}
          </Link>
        )}
      </div>

      {/* Stats cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => (
          <motion.div
            key={index}
            id={card.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: index * 0.05,
            }}
          >
            <StatsCardComponent
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              iconColor={card.iconColor}
              href={card.href}
            />
          </motion.div>
        ))}
      </div>

      {/* What's Next action section — hidden for now */}
      {/* {actionItems && (
        <WhatsNextCard
          pendingTasksCount={actionItems.pending_tasks_count ?? 0}
          pendingReviewsCount={actionItems.pending_reviews_count ?? 0}
          pendingTasks={pendingTasks}
        />
      )} */}

      {/* Progress cards */}
      <div className="grid grid-cols-1 gap-6">
        {teamProgressData && <TeamProgressCard data={teamProgressData} />}
        {/* TODO: Re-enable Personal Progress for full release (next year's batch) */}
      </div>

      {/* Individual Weekly Report Modal */}
      {/* TODO: Re-enable for full release */}
      {/* {user?.id && (
        <IndividualWeeklyReportModal
          open={isIndividualReportModalOpen}
          onOpenChange={setIsIndividualReportModalOpen}
          userId={user.id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      )} */}
    </div>
  );
}

// Progress card component for teams
function TeamProgressCard({ data }: { data: TeamProgressData }) {
  const router = useRouter();
  // Get the first team name for the title, or use default
  const teamName = data.teams.length > 0 ? data.teams[0].name : "Your Teams";
  const cardTitle =
    data.teams.length === 1
      ? `${teamName} Team Progress`
      : "Your Teams Progress";

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center gap-3">
          <IconContainer
            icon={Building2}
            iconColor="text-black dark:text-white"
            backgroundColor="bg-gray-100 dark:bg-gray-800"
          />
          <CardTitle className="text-lg font-semibold">{cardTitle}</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/team-journey")}
        >
          {data.joinTeamsText}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex-1 space-y-6">
          {!data.hasTeams ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="text-muted-foreground mb-3 h-10 w-10" />
              <p className="text-muted-foreground mb-1 font-medium">
                No team yet
              </p>
              <p className="text-muted-foreground mb-4 text-sm">
                Join a team to start collaborating
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard/team-journey")}
              >
                Browse Teams
              </Button>
            </div>
          ) : (
            <>
              {/* Stats row - only show aggregate totals if multiple teams */}
              {data.stats.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {data.stats.map((stat, index) => (
                    <StatItem key={index} stat={stat} />
                  ))}
                </div>
              )}

              {/* Team member stats - show for each team */}
              {data.teams.map((team) => (
                <div key={team.id}>
                  {data.teams.length > 1 && (
                    <h3 className="text-muted-foreground mb-3 text-sm font-semibold">
                      {team.name}
                    </h3>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <TeamItem
                      stat={{
                        value: team.memberCount.toString(),
                        label: "Members",
                        icon: Users,
                        iconColor: "text-black dark:text-white",
                      }}
                    />
                    <TeamItem
                      stat={{
                        value: team.completedTasks.toString(),
                        label: "Tasks Completed",
                        icon: CheckCircle2,
                        iconColor: "text-black dark:text-white",
                      }}
                    />
                    <TeamItem
                      stat={{
                        value: team.totalPoints.toString(),
                        label: "Team Points",
                        icon: CreditCard,
                        iconColor: "text-black dark:text-white",
                      }}
                    />
                    <TeamItem
                      stat={{
                        value: team.totalXP.toString(),
                        label: "Team XP",
                        icon: Zap,
                        iconColor: "text-black dark:text-white",
                      }}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// TODO: Re-enable PersonalProgressCard for full release
/* function PersonalProgressCard({
  data,
  hasSubmittedThisWeek,
  onOpenReportModal,
}: {
  data: PersonalProgressData;
  hasSubmittedThisWeek: boolean;
  onOpenReportModal: () => void;
}) {
  const router = useRouter();
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center gap-3">
          <IconContainer
            icon={User}
            iconColor="text-black dark:text-white"
            backgroundColor="bg-gray-100 dark:bg-gray-800"
          />
          <CardTitle className="text-lg font-semibold">{data.title}</CardTitle>
        </div>
        <div className="w-[80px]"></div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {data.stats.map((stat, index) => (
              <StatItem key={index} stat={stat} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {data.activities.map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <BorderedContainer className="w-full justify-center">
            <Button
              variant="outline"
              size="sm"
              className="h-10 grow"
              disabled={true}
              onClick={onOpenReportModal}
            >
              <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {hasSubmittedThisWeek
                  ? "Report Submitted"
                  : "Submit Personal Weekly Report"}
              </span>
            </Button>
            <Button
              size="sm"
              className="bg-foreground text-background hover:bg-foreground/90 h-10 grow"
              onClick={() => router.push("/dashboard/my-journey")}
              disabled
            >
              <WandSparkles className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">View Progress</span>
            </Button>
          </BorderedContainer>
        </div>
      </CardContent>
    </Card>
  );
} */
