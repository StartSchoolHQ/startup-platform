/**
 * User Profile & Transaction Functions
 *
 * Handles:
 * - User profile management
 * - Transaction history
 * - Individual XP/Credits tracking
 * - Peer review statistics
 * - Individual activity stats
 */

import { createClient } from "../supabase/client";

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Get user transaction history with related data
 */
export async function getUserTransactions(userId: string, limit = 10) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      *,
      team:teams(name),
      achievement:achievements(name),
      revenue_stream:revenue_streams(product_name)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }
  return data;
}

/**
 * Get peer review statistics from transaction history
 * Only counts legitimate peer review rewards (10% of task rewards)
 * Filters to transactions from Nov 21, 2025 onwards (when system was fixed)
 */
export async function getPeerReviewStatsFromTransactions(userId: string) {
  const supabase = createClient();

  // Get validation type transactions (peer review rewards) from after the system was fixed
  // Only count transactions from Nov 21, 2025 onwards (when we fixed the peer review rewards)
  const { data: validationTransactions, error } = await supabase
    .from("transactions")
    .select("xp_change, points_change, created_at, metadata")
    .eq("user_id", userId)
    .eq("type", "validation")
    .is("team_id", null) // Peer review rewards are personal (team_id is NULL)
    .gte("xp_change", 0) // Only positive rewards (not penalties)
    .gte("created_at", "2025-11-21T13:00:00.000Z"); // Only count recent transactions with correct 10% calculation

  if (error) {
    throw error;
  }

  const transactions = validationTransactions || [];

  // Filter to ensure we only count legitimate peer review rewards
  // Any positive validation transaction is a legitimate peer review reward (10% of task rewards)
  const legitTransactions = transactions.filter((t) => {
    const xp = t.xp_change || 0;
    const points = t.points_change || 0;

    // Only count positive peer review rewards (no upper limit since high-difficulty tasks give high rewards)
    return xp > 0 && points > 0;
  });

  // Calculate totals
  const totalXpEarned = legitTransactions.reduce(
    (sum, t) => sum + (t.xp_change || 0),
    0
  );
  const totalPointsEarned = legitTransactions.reduce(
    (sum, t) => sum + (t.points_change || 0),
    0
  );
  const tasksReviewedCount = legitTransactions.length;

  return {
    tasksReviewedByUser: tasksReviewedCount,
    totalXpEarned,
    totalPointsEarned,
  };
}

/**
 * Get total individual XP and Credits earned
 * Includes: individual tasks + peer review rewards
 */
export async function getIndividualXPAndCredits(userId: string) {
  const supabase = createClient();

  // Get all transactions for individual context activities
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("xp_change, points_change, type")
    .eq("user_id", userId)
    .is("team_id", null) // Individual activities have team_id = NULL
    .gte("xp_change", 0); // Only positive gains

  if (error) {
    throw error;
  }

  const individualTransactions = transactions || [];

  // Calculate totals from all individual transactions (tasks, achievements, peer reviews, etc.)
  const totalXP = individualTransactions.reduce(
    (sum, t) => sum + (t.xp_change || 0),
    0
  );
  const totalCredits = individualTransactions.reduce(
    (sum, t) => sum + (t.points_change || 0),
    0
  );

  return {
    totalXP,
    totalCredits,
    transactionCount: individualTransactions.length,
  };
}

/**
 * Get individual activity statistics
 * Tracks meetings, achievements, etc.
 */
export async function getIndividualActivityStats(userId: string) {
  const supabase = createClient();

  // Get all individual activity transactions (meetings, achievements, etc.)
  const { data: individualTransactions, error } = await supabase
    .from("transactions")
    .select("xp_change, points_change, created_at, type, description")
    .eq("user_id", userId)
    .is("team_id", null) // Individual activities have team_id = NULL
    .gte("xp_change", 0); // Only positive gains

  if (error) {
    throw error;
  }

  const transactions = individualTransactions || [];

  // Calculate totals
  const totalXpEarned = transactions.reduce(
    (sum, t) => sum + (t.xp_change || 0),
    0
  );
  const totalPointsEarned = transactions.reduce(
    (sum, t) => sum + (t.points_change || 0),
    0
  );
  const totalActivities = transactions.length;

  // Count by activity type
  const meetingsCount = transactions.filter((t) => t.type === "meeting").length;
  const achievementsCount = transactions.filter(
    (t) => t.type === "achievement"
  ).length;

  return {
    totalXpEarned,
    totalPointsEarned,
    totalActivities,
    meetingsCompleted: meetingsCount,
    achievementsEarned: achievementsCount,
  };
}

/**
 * Get user's active team memberships with team details
 */
export async function getUserTeams(userId: string) {
  const supabase = createClient();

  const { data: memberships, error } = await supabase
    .from("team_members")
    .select(
      `
      team_role,
      joined_at,
      teams (
        id,
        name,
        description,
        member_count,
        created_at,
        founder_id
      )
    `
    )
    .eq("user_id", userId)
    .is("left_at", null); // Only active memberships

  if (error) throw error;

  return memberships || [];
}

/**
 * Check if user is team member (active membership)
 */
export async function isUserTeamMember(
  teamId: string,
  userId: string
): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();

  if (error) {
    return false;
  }

  return !!data;
}

/**
 * Get user's role in a specific team
 */
export async function getUserTeamRole(
  teamId: string,
  userId: string
): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("team_role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.team_role || null;
}
