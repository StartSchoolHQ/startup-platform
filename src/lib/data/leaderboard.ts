/**
 * Leaderboard Functions
 *
 * Handles:
 * - Smart snapshot leaderboard system
 * - Weekly leaderboard data with change indicators
 * - Leaderboard snapshot generation
 * - Available weeks tracking
 */

import { createClient } from "../supabase/client";

/**
 * Leaderboard entry with weekly change indicators
 */
export interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar_url: string | null;
  total_xp: number;
  total_points: number;
  achievements_count: number;
  tasks_completed: number;
  team_count: number;
  rank_position: number;
  xp_change: number;
  points_change: number;
  achievements_change: number;
  tasks_change: number;
  rank_change: number;
}

/**
 * Get leaderboard data with change indicators from previous week
 * Uses smart snapshot system for efficient weekly comparisons
 */
export async function getLeaderboardData(
  limit: number = 50,
  weekNumber?: number,
  weekYear?: number
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  try {
    const { data, error } = await (supabase as any).rpc(
      "get_leaderboard_data",
      {
        p_limit: limit,
        p_week_number: weekNumber || null,
        p_week_year: weekYear || null,
      }
    );

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Generate weekly leaderboard snapshots for all users
 * Typically run automatically but can be triggered manually
 */
export async function generateWeeklyLeaderboardSnapshots(
  weekNumber?: number,
  weekYear?: number
): Promise<{ success: boolean; message: string; usersProcessed: number }> {
  const supabase = createClient();

  try {
    const { data, error } = await (supabase as any).rpc(
      "generate_weekly_leaderboard_snapshots",
      {
        p_week_number: weekNumber || null,
        p_week_year: weekYear || null,
      }
    );

    if (error) {
      throw error;
    }

    return (
      data || { success: false, message: "Unknown error", usersProcessed: 0 }
    );
  } catch (error) {
    throw error;
  }
}

/**
 * Get available weeks for leaderboard viewing
 * Returns list of weeks that have snapshot data
 */
export async function getAvailableLeaderboardWeeks(): Promise<
  Array<{
    week_number: number;
    week_year: number;
    week_start: string;
    week_end: string;
    user_count: number;
  }>
> {
  const supabase = createClient();

  try {
    const { data, error } = await (supabase as any)
      .from("leaderboard_snapshots")
      .select("week_number, week_year, created_at")
      .order("week_year", { ascending: false })
      .order("week_number", { ascending: false });

    if (error) {
      throw error;
    }

    if (!data) return [];

    // Group by week and count users
    const weekMap = new Map<
      string,
      {
        week_number: number;
        week_year: number;
        user_count: number;
        created_at: string;
      }
    >();

    data.forEach((snapshot: any) => {
      const key = `${snapshot.week_year}-${snapshot.week_number}`;
      if (!weekMap.has(key)) {
        weekMap.set(key, {
          week_number: snapshot.week_number,
          week_year: snapshot.week_year,
          user_count: 0,
          created_at: snapshot.created_at,
        });
      }
      const week = weekMap.get(key)!;
      week.user_count++;
    });

    // Convert to array and add week start/end dates
    const weeks = Array.from(weekMap.values()).map((week) => {
      // Calculate week start/end dates
      const jan4 = new Date(week.week_year, 0, 4);
      const weekStart = new Date(jan4);
      weekStart.setDate(jan4.getDate() - jan4.getDay() + 1); // Monday of week 1
      weekStart.setDate(weekStart.getDate() + (week.week_number - 1) * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday

      return {
        week_number: week.week_number,
        week_year: week.week_year,
        week_start: weekStart.toISOString().split("T")[0],
        week_end: weekEnd.toISOString().split("T")[0],
        user_count: week.user_count,
      };
    });

    return weeks;
  } catch (error) {
    throw error;
  }
}

/**
 * Team leaderboard entry with weekly change indicators
 */
export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  total_xp: number;
  total_points: number;
  tasks_completed: number;
  meetings_count: number;
  member_count: number;
  rank_position: number;
  xp_change: number;
  points_change: number;
  tasks_change: number;
  meetings_change: number;
  rank_change: number;
}

/**
 * Get team leaderboard data with change indicators from previous week
 */
export async function getTeamLeaderboardData(
  limit: number = 50,
  weekNumber?: number,
  weekYear?: number
): Promise<TeamLeaderboardEntry[]> {
  const supabase = createClient();

  try {
    const { data, error } = await (supabase as any).rpc(
      "get_team_leaderboard_data",
      {
        p_limit: limit,
        p_week_number: weekNumber || null,
        p_week_year: weekYear || null,
      }
    );

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Get current week information (Riga timezone boundaries)
 * Uses database function for timezone-aware week calculation
 */
export async function getCurrentWeekInfo(): Promise<{
  week_number: number;
  week_year: number;
  week_start: string;
  week_end: string;
}> {
  const supabase = createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_riga_week_boundaries"
    );

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error("No week boundaries returned");
    }

    return data[0];
  } catch (error) {
    throw error;
  }
}
