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
 * Uses database RPC for proper timezone handling and time logic
 */
export async function hasUserSubmittedThisWeek(
  userId: string,
  teamId: string
): Promise<boolean> {
  try {
    const supabase = createClient();

    // Use database RPC - all time logic handled server-side
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "has_user_submitted_this_week",
      {
        p_user_id: userId,
        p_team_id: teamId,
      }
    );

    if (error) {
      console.error("Error checking submission status:", error);
      return false;
    }

    return data === true;
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

/**
 * Banner window: Friday 00:00 through Monday 10:00 Riga. `week_start` is
 * always a Monday, so Friday = week_start + 4 days. After Monday 10:00
 * `get_riga_week_boundaries` flips to the new week, whose Friday is ahead,
 * so the banner closes by itself.
 */
export function isWeeklyReportBannerWindow(
  week: WeekBoundaries,
  now: Date = new Date()
): boolean {
  const friday = new Date(week.week_start);
  friday.setDate(friday.getDate() + 4);
  return now >= friday;
}
