/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LeaderboardEntry,
  MyJourneyLeaderboardEntry,
  TeamLeaderboardEntry,
} from "@/types/leaderboard";
import {
  type LeaderboardEntry as DBLeaderboardEntry,
  type MyJourneyLeaderboardRow as DBMyJourneyEntry,
  type TeamLeaderboardEntry as DBTeamLeaderboardEntry,
} from "@/lib/leaderboard-server";

export type StreakMap = Map<
  string,
  { days: number; type: "active" | "warning" | "inactive" }
>;

function rankIconFor(rank: number): "crown" | "trophy" | "medal" | "none" {
  if (rank === 1) return "crown";
  if (rank === 2) return "trophy";
  if (rank === 3) return "medal";
  return "none";
}

function changeDirectionFor(
  rankChange: number,
  isNewEntry: boolean
): "up" | "down" | "none" {
  if (isNewEntry) return "none";
  if (rankChange > 0) return "up";
  if (rankChange < 0) return "down";
  return "none";
}

/** Database row → UI entry for the Team Journey members board. */
export function convertToLeaderboardEntry(
  dbEntry: DBLeaderboardEntry,
  currentUserId?: string,
  userStreaks?: StreakMap
): LeaderboardEntry {
  const isNewEntry = !!(dbEntry as any).is_new_entry;

  const userStreak = userStreaks?.get(dbEntry.user_id) || {
    days: 0,
    type: "inactive" as const,
  };

  return {
    rank: dbEntry.rank_position,
    user: {
      userId: dbEntry.user_id,
      name: dbEntry.user_name || "Unknown User",
      avatar: dbEntry.user_avatar_url || "/avatars/john-doe.jpg",
      teams: dbEntry.team_name || "No Team",
      isCurrentUser: dbEntry.user_id === currentUserId,
    },
    xp: { current: dbEntry.total_xp, change: dbEntry.xp_change },
    points: { current: dbEntry.total_points, change: dbEntry.points_change },
    achievements: {
      current: dbEntry.achievements_count,
      change: dbEntry.achievements_change,
    },
    tasks: { current: dbEntry.tasks_completed, change: dbEntry.tasks_change },
    weeklyReports: (dbEntry as any).weekly_reports_count ?? 0,
    peerReviews: (dbEntry as any).peer_reviews_count ?? 0,
    streak: userStreak,
    change: {
      direction: changeDirectionFor(dbEntry.rank_change, isNewEntry),
      amount: Math.abs(dbEntry.rank_change),
      isNew: isNewEntry,
    },
    rankIcon: rankIconFor(dbEntry.rank_position),
  };
}

/** Database row → UI entry for the teams board. */
export function convertToTeamLeaderboardEntry(
  dbEntry: DBTeamLeaderboardEntry,
  userTeamIds?: string[]
): TeamLeaderboardEntry {
  const isNewEntry = !!(dbEntry as any).is_new_entry;

  return {
    rank: dbEntry.rank_position,
    team: {
      teamId: dbEntry.team_id,
      name: dbEntry.team_name || "Unknown Team",
      logoUrl: dbEntry.team_logo_url || undefined,
      memberCount: dbEntry.member_count,
      isCurrentUserTeam: userTeamIds?.includes(dbEntry.team_id),
      xpPerMember: (dbEntry as any).xp_per_member ?? undefined,
    },
    xp: { current: dbEntry.total_xp, change: dbEntry.xp_change },
    points: { current: dbEntry.total_points, change: dbEntry.points_change },
    tasks: { current: dbEntry.tasks_completed, change: dbEntry.tasks_change },
    meetings: {
      current: dbEntry.meetings_count,
      change: dbEntry.meetings_change,
    },
    change: {
      direction: changeDirectionFor(dbEntry.rank_change, isNewEntry),
      amount: Math.abs(dbEntry.rank_change),
      isNew: isNewEntry,
    },
    rankIcon: rankIconFor(dbEntry.rank_position),
  };
}

/** Database row → UI entry for the My Journey board. */
export function convertToMyJourneyEntry(
  dbEntry: DBMyJourneyEntry,
  currentUserId?: string
): MyJourneyLeaderboardEntry {
  return {
    rank: dbEntry.rank_position,
    user: {
      userId: dbEntry.user_id,
      name: dbEntry.user_name || "Unknown User",
      avatar: dbEntry.user_avatar_url || "/avatars/john-doe.jpg",
      isCurrentUser: dbEntry.user_id === currentUserId,
    },
    xp: dbEntry.my_journey_xp ?? 0,
    credits: dbEntry.my_journey_credits ?? 0,
    tasks: dbEntry.tasks_completed ?? 0,
    rankIcon: rankIconFor(dbEntry.rank_position),
  };
}
