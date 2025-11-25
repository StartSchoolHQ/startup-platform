import { createClient } from "@/lib/supabase/client";

export interface WeekBoundaries {
  week_start: string;
  week_end: string;
  week_number: number;
  week_year: number;
}

/**
 * Get current week boundaries using Riga timezone
 */
export async function getCurrentWeekBoundaries(): Promise<WeekBoundaries | null> {
  try {
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_riga_week_boundaries"
    );

    if (error) {
      console.error("Error getting week boundaries:", error);
      return null;
    }

    if (!data || data.length === 0) {
      console.error("No week boundaries returned");
      return null;
    }

    return data[0];
  } catch (error) {
    console.error("Error in getCurrentWeekBoundaries:", error);
    return null;
  }
}

/**
 * Check if user has already submitted weekly report for current week
 */
export async function hasUserSubmittedThisWeek(
  userId: string,
  teamId: string
): Promise<boolean> {
  try {
    const weekBoundaries = await getCurrentWeekBoundaries();
    if (!weekBoundaries) return false;

    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("weekly_reports")
      .select("id")
      .eq("user_id", userId)
      .eq("team_id", teamId)
      .eq("context", "team")
      .eq("week_number", weekBoundaries.week_number)
      .eq("week_year", weekBoundaries.week_year)
      .limit(1);

    if (error) {
      console.error("Error checking submission status:", error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error("Error in hasUserSubmittedThisWeek:", error);
    return false;
  }
}

/**
 * Format week boundaries for display
 */
export function formatWeekPeriod(weekBoundaries: WeekBoundaries): string {
  const startDate = new Date(weekBoundaries.week_start).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );
  const endDate = new Date(weekBoundaries.week_end).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );

  return `Week ${weekBoundaries.week_number}: ${startDate} - ${endDate}`;
}

// Individual context functions
export async function hasUserSubmittedThisWeekIndividual(
  userId: string
): Promise<boolean> {
  try {
    const weekBoundaries = await getCurrentWeekBoundaries();
    if (!weekBoundaries) return false;

    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("weekly_reports")
      .select("id")
      .eq("user_id", userId)
      .eq("context", "individual")
      .is("team_id", null)
      .eq("week_number", weekBoundaries.week_number)
      .eq("week_year", weekBoundaries.week_year)
      .limit(1);

    if (error) {
      console.error("Error checking individual submission status:", error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error("Error in hasUserSubmittedThisWeekIndividual:", error);
    return false;
  }
}

export async function getUserIndividualWeeklyReports(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("context", "individual")
    .is("team_id", null)
    .order("week_year", { ascending: false })
    .order("week_number", { ascending: false });

  if (error) {
    console.error("Error fetching individual weekly reports:", error);
    return [];
  }

  return data || [];
}
