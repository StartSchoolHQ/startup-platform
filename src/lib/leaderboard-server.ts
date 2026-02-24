import { createClient } from "@/lib/supabase/server";

// Type definition for team leaderboard entry returned by database function
export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  team_logo_url: string | null;
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

// Type definition for leaderboard entry returned by database function
export interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar_url: string | null;
  total_xp: number;
  total_points: number;
  achievements_count: number;
  tasks_completed: number;
  team_name: string | null;
  rank_position: number;
  xp_change: number;
  points_change: number;
  achievements_change: number;
  tasks_change: number;
  rank_change: number;
}

/**
 * Server-side function to get leaderboard data (for use in server components)
 */
export async function getServerSideLeaderboardData(
  limit: number = 50,
  weekNumber?: number,
  weekYear?: number
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  try {
    // Use any type assertion since the function exists but isn't in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_leaderboard_data",
      {
        p_limit: limit,
        p_week_number: weekNumber || null,
        p_week_year: weekYear || null,
      }
    );

    if (error) {
      console.error("Error fetching leaderboard data:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getServerSideLeaderboardData:", error);
    throw error;
  }
}

/**
 * Server-side function to get current week info (for use in server components)
 */
export async function getServerSideCurrentWeekInfo(): Promise<{
  week_number: number;
  week_year: number;
  week_start: string;
  week_end: string;
}> {
  const supabase = await createClient();

  try {
    // Use any type assertion since the function exists but isn't in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_riga_week_boundaries"
    );

    if (error) {
      console.error("Error getting current week info:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error("No week boundaries returned");
    }

    return data[0];
  } catch (error) {
    console.error("Error in getServerSideCurrentWeekInfo:", error);
    throw error;
  }
}

/**
 * Server-side function to get available weeks for leaderboard viewing
 */
export async function getServerSideAvailableWeeks(): Promise<
  Array<{
    week_number: number;
    week_year: number;
    week_start: string;
    week_end: string;
    user_count: number;
  }>
> {
  const supabase = await createClient();

  try {
    // Use any type assertion since leaderboard_snapshots table isn't in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("leaderboard_snapshots")
      .select("week_number, week_year, created_at")
      .order("week_year", { ascending: false })
      .order("week_number", { ascending: false });

    if (error) {
      console.error("Error fetching available weeks:", error);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.forEach((snapshot: any) => {
      const key = `${snapshot.week_year}-${snapshot.week_number}`;
      if (!weekMap.has(key)) {
        weekMap.set(key, {
          week_number: snapshot.week_number,
          week_year: snapshot.week_year,
          user_count: 0,
          created_at: snapshot.created_at || "",
        });
      }
      weekMap.get(key)!.user_count++;
    });

    // Convert to array and calculate week boundaries
    const weeks = Array.from(weekMap.values());
    const weekBoundaries = weeks.map((week) => {
      // Simple week boundary calculation (can be enhanced later with proper Riga timezone logic)
      const startOfYear = new Date(week.week_year, 0, 1);
      const daysOffset = (week.week_number - 1) * 7;
      const weekStart = new Date(
        startOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000
      );
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

      return {
        ...week,
        week_start: weekStart.toISOString().split("T")[0],
        week_end: weekEnd.toISOString().split("T")[0],
      };
    });

    return weekBoundaries;
  } catch (error) {
    console.error("Error in getServerSideAvailableWeeks:", error);
    throw error;
  }
}

/**
 * Calculate user activity streak based on transaction history
 */
export async function calculateUserStreak(userId: string): Promise<{
  days: number;
  type: "active" | "warning" | "inactive";
}> {
  const supabase = await createClient();

  try {
    // Get user's recent transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: transactions, error } = await (supabase as any)
      .from("transactions")
      .select("created_at, xp_change, points_change")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .gt("xp_change", 0) // Only count positive XP gains (activity)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!transactions || transactions.length === 0) {
      return { days: 0, type: "inactive" };
    }

    // Group transactions by date and calculate daily activity
    const dailyActivity = new Map<string, boolean>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions.forEach((transaction: any) => {
      const date = new Date(transaction.created_at).toISOString().split("T")[0];
      dailyActivity.set(date, true);
    });

    // Calculate current streak (consecutive days from today backwards)
    let streakDays = 0;
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toISOString().split("T")[0];

      if (dailyActivity.has(dateString)) {
        streakDays++;
      } else {
        // If it's today and no activity, don't break streak yet
        if (i === 0) {
          continue;
        }
        break;
      }
    }

    // Determine streak type
    let type: "active" | "warning" | "inactive" = "inactive";
    if (streakDays >= 7) {
      type = "active";
    } else if (streakDays >= 3) {
      type = "warning";
    }

    return { days: streakDays, type };
  } catch (error) {
    console.error("Error calculating user streak:", error);
    return { days: 0, type: "inactive" };
  }
}

/**
 * Get user streaks for multiple users (optimized for leaderboard)
 */
export async function getUserStreaks(userIds: string[]): Promise<
  Map<
    string,
    {
      days: number;
      type: "active" | "warning" | "inactive";
    }
  >
> {
  const supabase = await createClient();
  const streakMap = new Map();

  try {
    // Get transactions for all users in batch
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: transactions, error } = await (supabase as any)
      .from("transactions")
      .select("user_id, created_at, xp_change")
      .in("user_id", userIds)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .gt("xp_change", 0)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Group transactions by user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userTransactions = new Map<string, any[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions?.forEach((transaction: any) => {
      if (!userTransactions.has(transaction.user_id)) {
        userTransactions.set(transaction.user_id, []);
      }
      userTransactions.get(transaction.user_id)!.push(transaction);
    });

    // Calculate streak for each user
    userIds.forEach((userId) => {
      const userTxns = userTransactions.get(userId) || [];

      if (userTxns.length === 0) {
        streakMap.set(userId, { days: 0, type: "inactive" });
        return;
      }

      // Group by date
      const dailyActivity = new Set<string>();
      userTxns.forEach((txn) => {
        const date = new Date(txn.created_at).toISOString().split("T")[0];
        dailyActivity.add(date);
      });

      // Calculate streak
      let streakDays = 0;
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateString = checkDate.toISOString().split("T")[0];

        if (dailyActivity.has(dateString)) {
          streakDays++;
        } else {
          if (i === 0) continue; // Allow today to be inactive
          break;
        }
      }

      let type: "active" | "warning" | "inactive" = "inactive";
      if (streakDays >= 7) type = "active";
      else if (streakDays >= 3) type = "warning";

      streakMap.set(userId, { days: streakDays, type });
    });

    return streakMap;
  } catch (error) {
    console.error("Error getting user streaks:", error);
    // Return default values for all users
    userIds.forEach((userId) => {
      streakMap.set(userId, { days: 0, type: "inactive" });
    });
    return streakMap;
  }
}

/**
 * Server-side function to get team leaderboard data
 */
export async function getServerSideTeamLeaderboardData(
  limit: number = 50,
  weekNumber?: number,
  weekYear?: number
): Promise<TeamLeaderboardEntry[]> {
  const supabase = await createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_team_leaderboard_data",
      {
        p_limit: limit,
        p_week_number: weekNumber || null,
        p_week_year: weekYear || null,
      }
    );

    if (error) {
      console.error("Error fetching team leaderboard data:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getServerSideTeamLeaderboardData:", error);
    throw error;
  }
}

/**
 * Server-side function to get available weeks for team leaderboard
 */
export async function getServerSideTeamAvailableWeeks(): Promise<
  Array<{
    week_number: number;
    week_year: number;
    week_start: string;
    week_end: string;
    team_count: number;
  }>
> {
  const supabase = await createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("team_leaderboard_snapshots")
      .select("week_number, week_year")
      .order("week_year", { ascending: false })
      .order("week_number", { ascending: false });

    if (error) {
      console.error("Error fetching team available weeks:", error);
      throw error;
    }

    if (!data) return [];

    const weekMap = new Map<
      string,
      { week_number: number; week_year: number; team_count: number }
    >();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.forEach((snapshot: any) => {
      const key = `${snapshot.week_year}-${snapshot.week_number}`;
      if (!weekMap.has(key)) {
        weekMap.set(key, {
          week_number: snapshot.week_number,
          week_year: snapshot.week_year,
          team_count: 0,
        });
      }
      weekMap.get(key)!.team_count++;
    });

    return Array.from(weekMap.values()).map((week) => {
      const startOfYear = new Date(week.week_year, 0, 1);
      const daysOffset = (week.week_number - 1) * 7;
      const weekStart = new Date(
        startOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000
      );
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

      return {
        ...week,
        week_start: weekStart.toISOString().split("T")[0],
        week_end: weekEnd.toISOString().split("T")[0],
      };
    });
  } catch (error) {
    console.error("Error in getServerSideTeamAvailableWeeks:", error);
    throw error;
  }
}

/**
 * Server-side function to get user's team IDs
 */
export async function getServerSideUserTeamIds(
  userId: string
): Promise<string[]> {
  const supabase = await createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("team_members")
      .select("team_id")
      .eq("user_id", userId)
      .is("left_at", null);

    if (error) {
      console.error("Error fetching user team IDs:", error);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => row.team_id);
  } catch (error) {
    console.error("Error in getServerSideUserTeamIds:", error);
    return [];
  }
}

/**
 * Server-side function to generate weekly snapshots (admin use)
 */
export async function generateServerSideWeeklySnapshots(
  weekNumber?: number,
  weekYear?: number
): Promise<{ success: boolean; message: string; usersProcessed: number }> {
  const supabase = await createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "generate_weekly_leaderboard_snapshots",
      {
        p_week_number: weekNumber || null,
        p_week_year: weekYear || null,
      }
    );

    if (error) {
      console.error("Error generating weekly snapshots:", error);
      throw error;
    }

    return (
      data || { success: false, message: "Unknown error", usersProcessed: 0 }
    );
  } catch (error) {
    console.error("Error in generateServerSideWeeklySnapshots:", error);
    throw error;
  }
}

/**
 * Server-side function to generate weekly team snapshots
 */
export async function generateServerSideWeeklyTeamSnapshots(
  weekNumber?: number,
  weekYear?: number
): Promise<{ success: boolean; teamsProcessed: number }> {
  const supabase = await createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "generate_weekly_team_leaderboard_snapshots",
      {
        p_week_number: weekNumber || null,
        p_week_year: weekYear || null,
      }
    );

    if (error) {
      console.error("Error generating team snapshots:", error);
      throw error;
    }

    return {
      success: data?.success ?? false,
      teamsProcessed: data?.teams_processed ?? 0,
    };
  } catch (error) {
    console.error("Error in generateServerSideWeeklyTeamSnapshots:", error);
    throw error;
  }
}
