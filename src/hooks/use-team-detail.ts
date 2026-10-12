"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getTeamAchievementDashboard,
  getTeamDetails,
  getTeamStatsCombined,
  getTeamStrikes,
  getTeamWeeklyReports,
  getUserTeamRole,
  isUserTeamMember,
} from "@/lib/database";
import {
  getCurrentWeekBoundaries,
  hasUserSubmittedThisWeek,
} from "@/lib/weekly-reports";
import {
  groupWeeklyReports,
  sortTeamAchievements,
  transformDashboardTasks,
  transformStrikes,
} from "@/lib/team-journey/detail-transforms";

export type TeamDetail = NonNullable<
  Awaited<ReturnType<typeof getTeamDetails>>
>;
export type TeamDetailMember = TeamDetail["members"][number];

/** Client meetings a team must log before its task phases open. */
export const MEETINGS_TO_UNLOCK = 8;

/**
 * Every read the team page needs, under the `["teamJourney", …]` keys the
 * rest of the app invalidates. The query set and shaping are the ones the
 * page carried inline before 2026-10-12; only the home moved.
 */
export function useTeamDetail(
  teamId: string,
  userId: string | undefined,
  userLoading: boolean
) {
  const { data: team, isPending: loadingTeam } = useQuery({
    queryKey: ["teamJourney", "detail", teamId],
    queryFn: () => getTeamDetails(teamId),
    enabled: !!teamId && !userLoading,
  });

  const { data: isTeamMember = false } = useQuery({
    queryKey: ["teamJourney", "membership", teamId, userId],
    queryFn: () => isUserTeamMember(teamId, userId!),
    enabled: !!teamId && !!userId,
  });

  const { data: userRole = null } = useQuery({
    queryKey: ["teamJourney", "role", teamId, userId],
    queryFn: () => getUserTeamRole(teamId, userId!),
    enabled: !!teamId && !!userId,
  });

  const { data: hasSubmittedThisWeek = false } = useQuery({
    queryKey: ["teamJourney", "weeklySubmission", teamId, userId],
    queryFn: () => hasUserSubmittedThisWeek(userId!, teamId),
    enabled: !!teamId && !!userId && isTeamMember,
  });

  const { data: weekBoundaries } = useQuery({
    queryKey: ["weekBoundaries"],
    queryFn: () => getCurrentWeekBoundaries(),
    staleTime: 10 * 60 * 1000,
  });

  const members = useMemo(() => team?.members ?? [], [team?.members]);

  const { data: memberSubmissionStatus = {} } = useQuery({
    queryKey: ["teamJourney", "memberSubmissions", teamId, members.length],
    queryFn: async () => {
      const statuses = await Promise.all(
        members.map(async (m) => ({
          userId: m.user_id,
          submitted: await hasUserSubmittedThisWeek(m.user_id, teamId),
        }))
      );
      return Object.fromEntries(
        statuses.map((s) => [s.userId, s.submitted])
      ) as Record<string, boolean>;
    },
    enabled: !!teamId && members.length > 0,
  });

  const { data: dashboard, isPending: loadingAchievements } = useQuery({
    queryKey: ["teamJourney", "achievements", teamId, userId],
    queryFn: async () => {
      const data = await getTeamAchievementDashboard(teamId, userId!);
      return {
        achievements: data.achievements,
        tasks: transformDashboardTasks(data.tasks),
        clientMeetingsCount: data.clientMeetingsCount,
        achievementsUnlocked: data.achievementsUnlocked,
      };
    },
    enabled: !!teamId && !!userId,
  });

  const achievements = useMemo(
    () => sortTeamAchievements(dashboard?.achievements ?? []),
    [dashboard?.achievements]
  );

  const { data: strikes = [] } = useQuery({
    queryKey: ["teamJourney", "strikes", teamId],
    queryFn: async () => transformStrikes(await getTeamStrikes(teamId)),
    enabled: !!teamId,
  });

  const { data: weeklyReports = [] } = useQuery({
    queryKey: ["teamJourney", "weeklyReports", teamId],
    queryFn: async () => groupWeeklyReports(await getTeamWeeklyReports(teamId)),
    enabled: !!teamId,
  });

  const { data: statsData } = useQuery({
    queryKey: ["teamJourney", "stats", teamId],
    queryFn: () => getTeamStatsCombined(teamId),
    enabled: !!teamId,
  });

  return {
    team,
    loadingTeam,
    members,
    isTeamMember,
    userRole,
    hasSubmittedThisWeek,
    weekBoundaries,
    memberSubmissionStatus,
    achievements,
    tasks: dashboard?.tasks ?? [],
    loadingAchievements,
    meetingsCount: dashboard?.clientMeetingsCount ?? 0,
    achievementsUnlocked: dashboard?.achievementsUnlocked ?? false,
    strikes,
    weeklyReports,
    stats: {
      pointsInvested: statsData?.pointsInvested ?? 0,
      pointsEarned: statsData?.pointsEarned ?? 0,
      xpEarned: statsData?.xpEarned ?? 0,
    },
  };
}
