"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Zap,
  CreditCard,
  Target,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { useApp } from "@/contexts/app-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { OverviewSkeleton } from "@/components/dashboard/overview-skeleton";
import { TeamProgressCard } from "@/components/dashboard/team-progress-card";
import { statsGridColumnsClass } from "@/components/ui/stats-grid-skeleton";
import { StatsCard, TeamProgressData } from "@/types/dashboard";
import { createClient } from "@/lib/supabase/client";
import { economyLabels } from "@/lib/economy-labels";

const teamLabels = economyLabels("team");

/**
 * Everything the dashboard shows for the Team economy: rank badge, team
 * stat cards and team progress. The shell only mounts this while the Team
 * Journey phase is on (admins always), so nothing in here re-checks it.
 */
export function TeamJourneyOverview() {
  const { user } = useApp();
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
        "get_dashboard_overview_v2",
        { p_user_id: user!.id }
      );
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Derive stats cards from the consolidated overview response. All three
  // link into /dashboard/team-journey, which bounces students back while the
  // phase is off — the shell's gate keeps them in step.
  const statsCards: StatsCard[] = useMemo(() => {
    if (!dashboardOverview) return [];

    return [
      {
        id: "onborda-team-journey-balance",
        title: "Team Journey",
        value: `${dashboardOverview.team_xp ?? 0} ${teamLabels.xp}`,
        subtitle: `${dashboardOverview.team_points ?? 0} ${teamLabels.points}`,
        icon: CreditCard,
        iconColor: "text-emerald-500",
        href: "/dashboard/team-journey",
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

  if (isLoadingOverview) {
    return <OverviewSkeleton cardCount={3} />;
  }

  if (isOverviewError) {
    return (
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
    );
  }

  return (
    <>
      {/* Leaderboard rank badge — Team economy data, so it follows the
          Team Journey phase. */}
      {actionItems && actionItems.leaderboard_rank > 0 && (
        <Link
          href="/dashboard/leaderboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
        >
          <Trophy className="h-4 w-4 text-amber-500" />
          <span>
            Ranked <strong>#{actionItems.leaderboard_rank}</strong> of{" "}
            {actionItems.leaderboard_total_users}
          </span>
          {actionItems.leaderboard_xp_change > 0 && (
            <Badge variant="secondary" className="text-xs">
              +{actionItems.leaderboard_xp_change} Team XP this week
            </Badge>
          )}
        </Link>
      )}

      {/* Stats cards grid */}
      <div className={`grid gap-4 ${statsGridColumnsClass(statsCards.length)}`}>
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
    </>
  );
}
