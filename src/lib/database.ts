import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types/team-journey";
import type { Json } from "@/types/database";

// ============================================================================
// RETRY LOGIC UTILITY
// ============================================================================

/**
 * Retry wrapper for database operations with exponential backoff
 * Handles temporary connection issues gracefully
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Don't retry on certain error types
      if (error && typeof error === "object" && "code" in error) {
        const dbError = error as { code?: string };
        // Don't retry on authentication, permission, or constraint violations
        if (
          dbError.code === "PGRST301" || // Authentication required
          dbError.code === "PGRST116" || // Permission denied
          dbError.code === "23514" || // Check constraint violation
          dbError.code === "23505"
        ) {
          // Unique constraint violation
          throw error;
        }
      }

      if (attempt === maxRetries) throw error;

      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(
        `Database operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("All retry attempts failed");
}

// Type for team data from relationship queries
interface TeamRelation {
  name: string;
  id?: string;
  description?: string | null;
}

// Type for user data from relationship queries
interface UserRelation {
  email: string;
  name: string | null;
  id?: string;
  avatar_url?: string | null;
}

// Database type interfaces
export interface DatabaseTeam {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived";
  created_at: string;
  member_count: number | null;
  strikes_count?: number | null;
  team_members?: {
    user_id: string;
    team_role: "member" | "leader" | "founder" | "co_founder";
    users?: {
      id: string;
      name: string | null;
      avatar_url: string | null;
      total_xp: number;
      total_points: number;
    };
  }[];
  revenue_streams?: {
    mrr_amount: number;
    verified: boolean;
  }[];
}

// Debug function to check auth status
export async function debugAuthStatus() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  console.log("Auth user:", user);
  console.log("Auth error:", error);
  return { user, error };
}

// User profile functions
export async function getUserProfile(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
  return data;
}

// Transaction history functions
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
    console.error("Error fetching user transactions:", error);
    throw error;
  }
  return data;
}

// Get peer review statistics from transactions
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
    console.error("Error fetching peer review transactions:", error);
    throw error;
  }

  const transactions = validationTransactions || [];

  // Filter to ensure we only count legitimate peer review rewards (should be around 10% of task rewards)
  // Peer review rewards should typically be small amounts (1-50 XP range for most tasks)
  const legitTransactions = transactions.filter((t) => {
    const xp = t.xp_change || 0;
    const points = t.points_change || 0;

    // Only count transactions that look like proper 10% peer review rewards
    // (typically 1-50 XP range, not full task rewards of 100+ XP)
    return xp > 0 && xp <= 50 && points > 0 && points <= 10;
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
    console.error("Error fetching individual activity transactions:", error);
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

// Get team points invested (total negative point transactions for team activities)
export async function getTeamPointsInvested(teamId: string) {
  const supabase = createClient();

  // Get all negative point transactions related to this team (investments/costs)
  const { data: investmentTransactions, error } = await supabase
    .from("transactions")
    .select("points_change")
    .eq("team_id", teamId)
    .lt("points_change", 0); // Only negative transactions (investments)

  if (error) {
    console.error("Error fetching team investment transactions:", error);
    return 0;
  }

  const transactions = investmentTransactions || [];

  // Sum up all negative point changes (convert to positive for display)
  const totalInvested = transactions.reduce(
    (sum, t) => sum + Math.abs(t.points_change || 0),
    0
  );

  return totalInvested;
}

// Get total team points earned from all team activities (tasks, meetings, etc.)
export async function getTeamPointsEarned(teamId: string) {
  const supabase = createClient();

  // Get all positive point transactions related to this team
  const { data: earnedTransactions, error } = await supabase
    .from("transactions")
    .select("points_change")
    .eq("team_id", teamId)
    .gt("points_change", 0); // Only positive transactions (earnings)

  if (error) {
    console.error("Error fetching team earned transactions:", error);
    return 0;
  }

  const transactions = earnedTransactions || [];

  // Sum up all positive point changes
  const totalEarned = transactions.reduce(
    (sum, t) => sum + (t.points_change || 0),
    0
  );

  return totalEarned;
}

export async function getTeamXPEarned(teamId: string) {
  const supabase = createClient();

  // Get all positive XP transactions related to this team
  const { data: earnedTransactions, error } = await supabase
    .from("transactions")
    .select("xp_change")
    .eq("team_id", teamId)
    .gt("xp_change", 0); // Only positive transactions (earnings)

  if (error) {
    console.error("Error fetching team earned XP transactions:", error);
    return 0;
  }

  const transactions = earnedTransactions || [];

  // Sum up all positive XP changes
  const totalEarned = transactions.reduce(
    (sum, t) => sum + (t.xp_change || 0),
    0
  );

  return totalEarned;
}

// Get team activity statistics from transactions
export async function getTeamActivityStats(userId: string, teamId: string) {
  const supabase = createClient();

  // Get all team activity transactions for this user in this team
  const { data: teamTransactions, error } = await supabase
    .from("transactions")
    .select("xp_change, points_change, created_at, type, description")
    .eq("user_id", userId)
    .eq("team_id", teamId) // Team activities have team_id set
    .gte("xp_change", 0); // Only positive gains

  if (error) {
    console.error("Error fetching team activity transactions:", error);
    throw error;
  }

  const transactions = teamTransactions || [];

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
  const tasksCompleted = transactions.filter((t) => t.type === "task").length;
  const validationsCompleted = transactions.filter(
    (t) => t.type === "validation"
  ).length;

  return {
    totalXpEarned,
    totalPointsEarned,
    totalActivities,
    tasksCompleted,
    validationsCompleted,
  };
}

// Simple function to get team strikes
export async function getTeamStrikes(teamId: string) {
  const supabase = createClient();

  // Type assertion for RPC function not in generated types
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        name: string,
        params: Record<string, unknown>
      ) => Promise<{ data: unknown; error: unknown }>;
    }
  ).rpc("get_team_strikes", {
    p_team_id: teamId,
  });

  if (error) {
    console.error("Error fetching team strikes:", error);
    throw error;
  }

  return data || [];
}

// Simple function to get team weekly reports
export async function getTeamWeeklyReports(teamId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("weekly_reports")
    .select(
      `
      id,
      week_number,
      week_year,
      week_start_date,
      week_end_date,
      submitted_at,
      submission_data,
      user_id,
      users (
        name,
        avatar_url
      )
    `
    )
    .eq("team_id", teamId)
    .eq("context", "team")
    .order("week_year", { ascending: false })
    .order("week_number", { ascending: false });

  if (error) {
    console.error("Error fetching team weekly reports:", error);
    throw error;
  }

  return data || [];
}

// Team statistics functions
export async function getUserTeamStats(userId: string) {
  const supabase = createClient();
  const { data: teamMemberships, error: teamError } = await supabase
    .from("team_members")
    .select("team_id, team_role")
    .eq("user_id", userId)
    .is("left_at", null); // Only active memberships

  if (teamError) {
    console.error("Error fetching team memberships:", teamError);
    throw teamError;
  }

  const { data: revenueStreams, error: revenueError } = await supabase
    .from("revenue_streams")
    .select("id, product_name, mrr_amount, type, verified")
    .eq("user_id", userId);

  if (revenueError) {
    console.error("Error fetching revenue streams:", revenueError);
    throw revenueError;
  }

  interface RevenueStream {
    id: string;
    product_name: string;
    mrr_amount: number | null;
    type: string;
    verified: boolean | null;
  }

  return {
    teamsCount: teamMemberships?.length || 0,
    revenueStreamsCount: revenueStreams?.length || 0,
    totalMRR:
      revenueStreams?.reduce(
        (sum: number, stream: RevenueStream) => sum + (stream.mrr_amount || 0),
        0
      ) || 0,
    verifiedStreams:
      revenueStreams?.filter((stream: RevenueStream) => stream.verified)
        .length || 0,
  };
}

// Team Creation and Management Functions
export async function createTeam(
  founderId: string,
  teamName: string,
  description: string
) {
  const supabase = createClient();

  console.log("Creating team with:", { founderId, teamName, description });

  // First, check if user is already in an active team
  try {
    const { data: existingMembership, error: membershipError } = await supabase
      .from("team_members")
      .select(
        `
        team_id,
        teams!inner (
          name
        )
      `
      )
      .eq("user_id", founderId)
      .is("left_at", null)
      .limit(1);

    if (membershipError) {
      console.error(
        "Database error checking team membership:",
        membershipError
      );
      throw new Error(
        "Unable to verify team membership status. Please try again."
      );
    }

    if (existingMembership && existingMembership.length > 0) {
      const teamName =
        (existingMembership[0].teams as unknown as TeamRelation)?.name ||
        "Unknown Team";
      throw new Error(
        `Cannot create team: You are already a member of "${teamName}". Each user can only be part of one team at a time.`
      );
    }
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (
      error instanceof Error &&
      error.message.startsWith("Cannot create team:")
    ) {
      throw error;
    }
    // Otherwise, wrap any other error
    console.error("Unexpected error checking team membership:", error);
    throw new Error("Unable to verify team membership. Please try again.");
  }

  // Check if user has enough credits (team creation costs 100 credits)
  const TEAM_CREATION_COST = 100;

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", founderId)
    .single();

  if (userError) {
    console.error("Error fetching user:", userError);
    throw userError;
  }

  console.log("User credits:", user?.total_points);

  if (!user || (user.total_points || 0) < TEAM_CREATION_COST) {
    throw new Error("Insufficient credits to create team");
  }

  // Create team
  console.log("Attempting to create team...");
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name: teamName,
      description,
      founder_id: founderId,
      member_count: 1,
      formation_cost: TEAM_CREATION_COST,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (teamError) {
    console.error("Error creating team:", teamError);
    throw teamError;
  }

  console.log("Team created successfully:", team);

  // Add founder as team member
  console.log("Adding founder as team member...");
  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: founderId,
    team_role: "founder",
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    console.error("Error adding founder as member:", memberError);
    // Clean up team if member creation fails
    await supabase.from("teams").delete().eq("id", team.id);
    throw memberError;
  }

  console.log("Founder added as member successfully");

  // Deduct credits and record transaction
  console.log("Updating user credits...");
  const { error: updateError } = await supabase
    .from("users")
    .update({
      total_points: (user.total_points || 0) - TEAM_CREATION_COST,
    })
    .eq("id", founderId);

  if (updateError) {
    console.error("Error updating user credits:", updateError);
    throw updateError;
  }

  console.log("Recording transaction...");
  const { error: transactionError } = await supabase
    .from("transactions")
    .insert({
      user_id: founderId,
      team_id: team.id,
      activity_type: "team",
      type: "team_cost",
      points_change: -TEAM_CREATION_COST,
      xp_change: 0,
      points_type: "individual",
      description: `Created team: ${teamName}`,
      created_at: new Date().toISOString(),
    });

  if (transactionError) {
    console.error("Error recording transaction:", transactionError);
    throw transactionError;
  }

  console.log("Team creation completed successfully");
  return team;
}

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

export async function getTeamDetails(teamId: string) {
  const supabase = createClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (teamError) throw teamError;

  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select(
      `
      user_id,
      team_role,
      joined_at,
      users (
        name,
        email,
        avatar_url,
        graduation_level,
        total_xp,
        total_points
      )
    `
    )
    .eq("team_id", teamId)
    .is("left_at", null);

  if (membersError) throw membersError;

  return {
    ...team,
    members: members || [],
  };
}

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
    console.error("Error checking team membership:", error);
    return false;
  }

  return !!data;
}

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
    console.error("Error fetching user team role:", error);
    return null;
  }

  return data?.team_role || null;
}

// Team Journey Functions for fetching products/teams with filtering, sorting, and search
export async function getAllTeamsForJourney(
  userId: string,
  options: {
    searchQuery?: string;
    sortBy?: "name" | "date" | "status" | "revenue";
    sortOrder?: "asc" | "desc";
    status?: "active" | "archived" | "all";
  } = {}
) {
  const supabase = createClient();

  let query = supabase
    .from("teams")
    .select(
      `
      id,
      name,
      description,
      status,
      created_at,
      member_count,
      team_members!inner (
        user_id,
        team_role,
        users (
          id,
          name,
          avatar_url,
          total_xp,
          total_points
        )
      ),
      revenue_streams (
        mrr_amount,
        verified
      )
    `
    )
    .is("team_members.left_at", null);

  // Apply search filter
  if (options.searchQuery) {
    query = query.ilike("name", `%${options.searchQuery}%`);
  }

  // Apply status filter
  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  // Apply sorting
  if (options.sortBy) {
    const ascending = options.sortOrder === "asc";
    switch (options.sortBy) {
      case "name":
        query = query.order("name", { ascending });
        break;
      case "date":
        query = query.order("created_at", { ascending });
        break;
      case "status":
        query = query.order("status", { ascending });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: teams, error } = await query;

  if (error) throw error;

  return teams || [];
}

export async function getUserTeamsForJourney(
  userId: string,
  options: {
    searchQuery?: string;
    sortBy?: "name" | "date" | "status" | "revenue";
    sortOrder?: "asc" | "desc";
    status?: "active" | "archived" | "all";
  } = {}
) {
  const supabase = createClient();

  let query = supabase
    .from("teams")
    .select(
      `
      id,
      name,
      description,
      status,
      created_at,
      member_count,
      team_members!inner (
        user_id,
        team_role,
        users (
          id,
          name,
          avatar_url,
          total_xp,
          total_points
        )
      ),
      revenue_streams (
        mrr_amount,
        verified
      )
    `
    )
    .eq("team_members.user_id", userId)
    .is("team_members.left_at", null);

  // Apply search filter
  if (options.searchQuery) {
    query = query.ilike("name", `%${options.searchQuery}%`);
  }

  // Apply status filter
  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  // Apply sorting
  if (options.sortBy) {
    const ascending = options.sortOrder === "asc";
    switch (options.sortBy) {
      case "name":
        query = query.order("name", { ascending });
        break;
      case "date":
        query = query.order("created_at", { ascending });
        break;
      case "status":
        query = query.order("status", { ascending });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: teams, error } = await query;

  if (error) throw error;

  return teams || [];
}

export async function getArchivedTeamsForJourney(
  userId: string,
  options: {
    searchQuery?: string;
    sortBy?: "name" | "date" | "status" | "revenue";
    sortOrder?: "asc" | "desc";
  } = {}
) {
  const supabase = createClient();

  let query = supabase
    .from("teams")
    .select(
      `
      id,
      name,
      description,
      status,
      created_at,
      member_count,
      team_members (
        user_id,
        team_role,
        left_at,
        users (
          id,
          name,
          avatar_url,
          total_xp,
          total_points
        )
      ),
      revenue_streams (
        mrr_amount,
        verified
      )
    `
    )
    .eq("status", "archived");

  // Apply search filter
  if (options.searchQuery) {
    query = query.ilike("name", `%${options.searchQuery}%`);
  }

  // Apply sorting
  if (options.sortBy) {
    const ascending = options.sortOrder === "asc";
    switch (options.sortBy) {
      case "name":
        query = query.order("name", { ascending });
        break;
      case "date":
        query = query.order("created_at", { ascending });
        break;
      case "status":
        query = query.order("status", { ascending });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: teams, error } = await query;

  if (error) throw error;

  return teams || [];
}

export async function leaveTeam(teamId: string, userId: string) {
  const supabase = createClient();

  // Check if user is founder (founders cannot leave, only dissolve)
  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("team_role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .is("left_at", null)
    .single();

  if (memberError) throw memberError;

  if (member.team_role === "founder") {
    throw new Error(
      "Founders cannot leave teams. Consider transferring ownership or dissolving the team."
    );
  }

  // Mark as left
  const { error: leaveError } = await supabase
    .from("team_members")
    .update({ left_at: new Date().toISOString() })
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (leaveError) throw leaveError;

  // Clean up ALL invitation records for this user-team combination
  // This prevents conflicts when the user is re-invited later
  const { error: inviteCleanupError } = await supabase
    .from("team_invitations")
    .delete()
    .eq("team_id", teamId)
    .eq("invited_user_id", userId);

  if (inviteCleanupError) {
    console.error("Error cleaning up invitation records:", inviteCleanupError);
    // Don't throw here - the main operation (leaving team) succeeded
  }

  // Update team member count
  const { error: countError } = await (
    supabase as unknown as {
      rpc: (
        name: string,
        params: Record<string, unknown>
      ) => Promise<{ error: unknown }>;
    }
  ).rpc("decrement_team_member_count", { team_id: teamId });

  if (countError) throw countError;

  return true;
}

// Real-time subscriptions
export function subscribeToUserUpdates(
  userId: string,
  callback: (data: unknown) => void
) {
  const supabase = createClient();
  return supabase
    .channel("user_updates")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "users",
        filter: `id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToUserTransactions(
  userId: string,
  callback: (data: unknown) => void
) {
  const supabase = createClient();
  return supabase
    .channel("user_transactions")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "transactions",
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}

// Helper function to transform database teams to Product interface
export function transformTeamToProduct(
  team: DatabaseTeam,
  currentUserId?: string
): Product {
  // Calculate total revenue from revenue streams
  const totalRevenue =
    team.revenue_streams?.reduce(
      (sum: number, stream: { mrr_amount: number; verified: boolean }) =>
        sum + (stream.verified ? Number(stream.mrr_amount) : 0),
      0
    ) || 0;

  // Transform team members to expected format and calculate total XP
  const teamMembers =
    team.team_members?.map(
      (member: {
        user_id: string;
        team_role: "member" | "leader" | "founder" | "co_founder";
        users?: {
          id: string;
          name: string | null;
          avatar_url: string | null;
          total_xp: number;
          total_points: number;
        };
      }) => ({
        id: member.users?.id || member.user_id,
        name: member.users?.name || "Unknown User",
        avatar: member.users?.avatar_url || "/avatars/john-doe.jpg",
      })
    ) || [];

  // Calculate total team XP from all members
  const totalTeamXP =
    team.team_members?.reduce(
      (sum: number, member) => sum + (member.users?.total_xp || 0),
      0
    ) || 0;

  // Get actual team size (number of active members)
  const actualTeamSize = team.team_members?.length || 0;

  // Check if current user is a member of this team
  const isCurrentUserMember = currentUserId
    ? team.team_members?.some((member) => member.user_id === currentUserId) ||
      false
    : false;

  return {
    id: team.id,
    name: team.name,
    description: team.description || "No description provided",
    status: team.status === "active" ? "Active" : "Inactive",
    customers: {
      count: actualTeamSize,
      label: "Team Members",
    },
    revenue: {
      amount: totalRevenue,
      label: "Monthly Revenue",
    },
    points: {
      amount: totalTeamXP,
      label: "Team Experience",
    },
    avatar: "/avatars/suppdocs.jpg", // Default avatar for now
    teamMembers,
    isCurrentUserMember,
  };
}

// Team Invitation Functions
export async function sendTeamInvitation(
  teamId: string,
  invitedUserEmail: string,
  inviterUserId: string,
  role: "member" | "leader" | "co_founder" = "member"
) {
  const supabase = createClient();

  // First, find the user by email
  const { data: invitedUser, error: userError } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("email", invitedUserEmail)
    .single();

  if (userError || !invitedUser) {
    throw new Error("User with this email not found");
  }

  // Check if the invited user is already in an active team
  try {
    const { data: existingMembership, error: membershipError } = await supabase
      .from("team_members")
      .select(
        `
        team_id,
        teams!inner (
          name
        )
      `
      )
      .eq("user_id", invitedUser.id)
      .is("left_at", null)
      .limit(1);

    if (membershipError) {
      console.error(
        "Database error checking team membership:",
        membershipError
      );
      throw new Error(
        "Unable to verify user's team membership status. Please try again."
      );
    }

    if (existingMembership && existingMembership.length > 0) {
      const teamName =
        (existingMembership[0].teams as unknown as TeamRelation)?.name ||
        "Unknown Team";
      const userName = invitedUser.name || invitedUser.email;
      throw new Error(
        `Cannot send invitation: ${userName} is already a member of "${teamName}". Users can only be part of one team at a time.`
      );
    }
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (
      error instanceof Error &&
      error.message.startsWith("Cannot send invitation:")
    ) {
      throw error;
    }
    // Otherwise, wrap any other error
    console.error("Unexpected error checking team membership:", error);
    throw new Error(
      "Unable to verify user's team membership. Please try again."
    );
  }

  // Check if user is already a team member
  const { data: existingMember } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", invitedUser.id)
    .is("left_at", null)
    .maybeSingle();

  if (existingMember) {
    throw new Error("User is already a member of this team");
  }

  // Check if invitation already exists
  const { data: existingInvitation, error: checkError } = await supabase
    .from("team_invitations")
    .select("id")
    .eq("team_id", teamId)
    .eq("invited_user_id", invitedUser.id)
    .eq("status", "pending")
    .maybeSingle();

  // Log any errors but don't fail the invitation process
  if (checkError) {
    console.warn("Warning checking existing invitation:", checkError);
  }

  if (existingInvitation) {
    throw new Error("Invitation already sent to this user");
  }

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("team_invitations")
    .insert({
      team_id: teamId,
      invited_user_id: invitedUser.id,
      invited_by_user_id: inviterUserId,
      role,
      status: "pending",
    })
    .select()
    .single();

  if (inviteError) throw inviteError;

  return invitation;
}

export async function getPendingInvitations(userId: string) {
  const supabase = createClient();

  const { data: invitations, error } = await supabase
    .from("team_invitations")
    .select(
      `
      id,
      team_id,
      role,
      status,
      created_at,
      teams (
        id,
        name,
        description,
        status,
        member_count
      ),
      invited_by:users!team_invitations_invited_by_user_id_fkey1 (
        id,
        name,
        email,
        avatar_url
      )
    `
    )
    .eq("invited_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return invitations || [];
}

export async function getSentInvitations(userId: string) {
  const supabase = createClient();

  const { data: invitations, error } = await supabase
    .from("team_invitations")
    .select(
      `
      id,
      team_id,
      role,
      status,
      created_at,
      responded_at,
      teams (
        id,
        name,
        description,
        status,
        member_count
      ),
      invited_user:users!team_invitations_invited_user_id_fkey1 (
        id,
        name,
        email,
        avatar_url
      )
    `
    )
    .eq("invited_by_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return invitations || [];
}

export async function respondToInvitation(
  invitationId: string,
  userId: string,
  response: "accepted" | "declined"
) {
  const supabase = createClient();

  // Get invitation details
  const { data: invitation, error: inviteError } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("id", invitationId)
    .eq("invited_user_id", userId)
    .eq("status", "pending")
    .single();

  if (inviteError || !invitation) {
    throw new Error("Invitation not found or already responded to");
  }

  // Update invitation status
  const { error: updateError } = await supabase
    .from("team_invitations")
    .update({
      status: response,
      responded_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (updateError) throw updateError;

  // If accepted, add user to team members
  if (response === "accepted") {
    // First check if user is already in an active team
    try {
      const { data: existingMembership, error: membershipError } =
        await supabase
          .from("team_members")
          .select(
            `
          team_id,
          teams!inner (
            name
          )
        `
          )
          .eq("user_id", userId)
          .is("left_at", null)
          .limit(1);

      if (membershipError) {
        console.error(
          "Database error checking team membership:",
          membershipError
        );
        throw new Error(
          "Unable to verify your team membership status. Please try again."
        );
      }

      if (existingMembership && existingMembership.length > 0) {
        const teamName =
          (existingMembership[0].teams as unknown as TeamRelation)?.name ||
          "Unknown Team";
        throw new Error(
          `Cannot accept invitation: You are already a member of "${teamName}". You can only be part of one team at a time.`
        );
      }
    } catch (error) {
      // If it's already our custom error, re-throw it
      if (
        error instanceof Error &&
        error.message.startsWith("Cannot accept invitation:")
      ) {
        throw error;
      }
      // Otherwise, wrap any other error
      console.error("Unexpected error checking team membership:", error);
      throw new Error("Unable to verify team membership. Please try again.");
    }

    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: invitation.team_id,
      user_id: userId,
      team_role: invitation.role,
    });

    if (memberError) throw memberError;

    // Update team member count
    const { error: countError } = await (
      supabase as unknown as {
        rpc: (
          name: string,
          params: Record<string, unknown>
        ) => Promise<{ error: unknown }>;
      }
    ).rpc("increment_team_member_count", {
      team_id: invitation.team_id,
    });

    // If the RPC function doesn't exist, update manually
    if (countError) {
      const { data: currentTeam } = await supabase
        .from("teams")
        .select("member_count")
        .eq("id", invitation.team_id)
        .single();

      await supabase
        .from("teams")
        .update({ member_count: (currentTeam?.member_count || 0) + 1 })
        .eq("id", invitation.team_id);
    }
  }

  return { success: true };
}

export async function getInvitationCount(userId: string): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("team_invitations")
    .select("*", { count: "exact", head: true })
    .eq("invited_user_id", userId)
    .eq("status", "pending");

  if (error) throw error;

  return count || 0;
}

// Remove a team member (for team management)
export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();

  // Remove the team member
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing team member:", error);
    throw error;
  }

  // Clean up ALL invitation records for this user-team combination
  // This prevents conflicts when the user is re-invited later
  const { error: inviteCleanupError } = await supabase
    .from("team_invitations")
    .delete()
    .eq("team_id", teamId)
    .eq("invited_user_id", userId);

  if (inviteCleanupError) {
    console.error("Error cleaning up invitation records:", inviteCleanupError);
    // Don't throw here - the main operation (removing member) succeeded
  }

  // Update team member count
  const { data: currentTeam } = await supabase
    .from("teams")
    .select("member_count")
    .eq("id", teamId)
    .single();

  if (currentTeam) {
    await supabase
      .from("teams")
      .update({
        member_count: Math.max(0, (currentTeam.member_count || 0) - 1),
      })
      .eq("id", teamId);
  }
}

// Update team member role
export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  newRole: "member" | "leader" | "founder" | "co_founder"
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("team_members")
    .update({ team_role: newRole })
    .eq("team_id", teamId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating team member role:", error);
    throw error;
  }
}

// Disband team (remove ALL members including founder and mark team as archived)
export async function disbandTeam(teamId: string): Promise<void> {
  // Use the proper function that disbands everyone
  await archiveTeamAndDisbandMembers(teamId);
}

// Get users available for team invitation (excluding users already in any team, current team members, and those with pending invitations)
export async function getAvailableUsersForInvitation(
  teamId: string,
  searchTerm: string = ""
): Promise<
  {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
    graduation_level: number | null;
  }[]
> {
  const supabase = createClient();

  // First get current team member IDs
  const { data: teamMembers, error: membersError } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .is("left_at", null);

  if (membersError) throw membersError;

  const memberIds = teamMembers?.map((member) => member.user_id) || [];

  // Get users who are already in ANY active team (they can't be invited to another team)
  const { data: usersInTeams, error: teamsError } = await supabase
    .from("team_members")
    .select("user_id")
    .is("left_at", null);

  if (teamsError) throw teamsError;

  const usersInActiveTeams =
    usersInTeams?.map((member) => member.user_id) || [];

  // Get users who have pending invitations to this team
  const { data: pendingInvitations, error: invitationsError } = await supabase
    .from("team_invitations")
    .select("invited_user_id")
    .eq("team_id", teamId)
    .eq("status", "pending");

  if (invitationsError) throw invitationsError;

  const pendingUserIds =
    pendingInvitations?.map((inv) => inv.invited_user_id) || [];

  // Combine all user IDs to exclude: current team members + users in any team + pending invitations
  const excludeUserIds = [
    ...memberIds,
    ...usersInActiveTeams,
    ...pendingUserIds,
  ];

  // Then get all available users (those not in any active team and not already invited)
  let query = supabase
    .from("users")
    .select("id, name, email, avatar_url, graduation_level");

  // Exclude users who are already in teams or have pending invitations
  if (excludeUserIds.length > 0) {
    query = query.not("id", "in", `(${excludeUserIds.join(",")})`);
  }

  // Add search filter if provided
  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  const { data: users, error } = await query.limit(20);

  if (error) throw error;

  return users || [];
}

// Archive team and disband all members (including founder)
export async function archiveTeamAndDisbandMembers(teamId: string) {
  const supabase = createClient();

  try {
    // Use the database function that runs with elevated privileges
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)("disband_all_team_members", {
      team_id_param: teamId,
    });

    if (error) throw error;

    console.log(`Team ${teamId} archived and all members disbanded`);
    return { success: true };
  } catch (error) {
    console.error("Error archiving team and disbanding members:", error);
    throw error;
  }
}

// Get statistics about why users are not available for invitation (for UI display)
export async function getInvitationAvailabilityStats() {
  const supabase = createClient();

  // Total users
  const { count: totalUsers, error: totalError } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (totalError) throw totalError;

  // Users in active teams
  const { count: usersInTeams, error: teamsError } = await supabase
    .from("team_members")
    .select("user_id", { count: "exact", head: true })
    .is("left_at", null);

  if (teamsError) throw teamsError;

  // Users with pending invitations
  const { count: usersWithPendingInvites, error: invitesError } = await supabase
    .from("team_invitations")
    .select("invited_user_id", { count: "exact", head: true })
    .eq("status", "pending");

  if (invitesError) throw invitesError;

  return {
    totalUsers: totalUsers || 0,
    usersInTeams: usersInTeams || 0,
    usersWithPendingInvites: usersWithPendingInvites || 0,
    availableUsers:
      (totalUsers || 0) - (usersInTeams || 0) - (usersWithPendingInvites || 0),
  };
}

// Send team invitation by user ID (for internal use)
export async function sendTeamInvitationById(
  teamId: string,
  invitedUserId: string,
  role: "member" | "leader" | "co_founder" = "member"
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  // Get current authenticated user as the inviter
  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !currentUser) {
    throw new Error("You must be logged in to send invitations");
  }

  // Check if user exists
  const { data: invitedUser, error: userError } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("id", invitedUserId)
    .single();

  if (userError || !invitedUser) {
    throw new Error("User not found");
  }

  // Check if user is already a team member
  const { data: existingMember } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", invitedUser.id)
    .is("left_at", null)
    .maybeSingle();

  if (existingMember) {
    throw new Error("User is already a member of this team");
  }

  // Check if there's already a pending invitation
  const { data: existingInvitations } = await supabase
    .from("team_invitations")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("invited_user_id", invitedUser.id)
    .eq("status", "pending");

  if (existingInvitations && existingInvitations.length > 0) {
    throw new Error("User already has a pending invitation for this team");
  }

  // Get team information
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    throw new Error("Team not found");
  }

  // Create the invitation
  const { error: insertError } = await supabase
    .from("team_invitations")
    .insert({
      team_id: teamId,
      invited_user_id: invitedUser.id,
      invited_by_user_id: currentUser.id,
      role: role,
      status: "pending",
    });

  if (insertError) {
    console.error("Error creating invitation:", insertError);
    throw new Error("Failed to create invitation");
  }

  return {
    success: true,
    message: `Invitation sent to ${invitedUser.name || invitedUser.email}`,
  };
}

// Peer Review functions
export async function getAvailableTasksForReview(userId: string) {
  const supabase = createClient();

  // First, get the user's active team (should be only one)
  const { data: userTeams, error: userTeamsError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .is("left_at", null);

  if (userTeamsError) {
    console.error("Error fetching user teams:", userTeamsError);
    throw userTeamsError;
  }

  const userTeamIds = userTeams?.map((tm) => tm.team_id) || [];

  // Business rule: User should only be in one active team
  if (userTeamIds.length > 1) {
    console.warn(
      `User ${userId} is in multiple teams: ${userTeamIds.join(
        ", "
      )}. This should be cleaned up.`
    );
  }

  // Get tasks available for peer review (ONLY from teams user is NOT a member of)
  // External Peer Reviewer = someone from a different team than the submitting team
  let query = supabase
    .from("task_progress" as never)
    .select(
      `
      id,
      task_id,
      team_id,
      assigned_to_user_id,
      completed_at,
      submission_data,
      tasks(
        id,
        title,
        description,
        difficulty_level,
        base_xp_reward,
        base_points_reward,
        category,
        peer_review_criteria
      ),
      teams(
        id,
        name
      )
    `
    )
    .eq("status", "pending_review")
    .eq("context", "team")
    .is("reviewer_user_id", null); // Only show tasks that don't have a reviewer assigned yet

  // Users can only review tasks from teams they are NOT members of
  if (userTeamIds.length > 0) {
    userTeamIds.forEach((teamId) => {
      query = query.neq("team_id", teamId);
    });
  }
  // If user is not in any active team, they can review tasks from all teams (external to all)

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching available tasks for review:", error);
    throw error;
  }

  return data || [];
}

// Database cleanup function for multiple team memberships
export async function getUsersWithMultipleActiveTeams() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select(
      `
      user_id,
      team_id,
      joined_at,
      users!inner(email, name),
      teams!inner(name)
    `
    )
    .is("left_at", null);

  if (error) throw error;

  type UserTeamData = {
    user: { email: string; name: string | null };
    teams: Array<{
      team_id: string;
      team_name: string;
      joined_at: string;
    }>;
  };

  // Group by user_id and find those with multiple active memberships
  const userTeamCounts = data?.reduce(
    (acc: Record<string, UserTeamData>, member) => {
      if (!acc[member.user_id]) {
        acc[member.user_id] = {
          user: member.users as unknown as UserRelation,
          teams: [],
        };
      }
      acc[member.user_id].teams.push({
        team_id: member.team_id,
        team_name: (member.teams as unknown as TeamRelation).name,
        joined_at: member.joined_at || new Date().toISOString(),
      });
      return acc;
    },
    {} as Record<string, UserTeamData>
  );

  // Filter to only users with multiple teams
  const problematicUsers = Object.entries(userTeamCounts || {})
    .filter(([, data]) => data.teams.length > 1)
    .map(([user_id, data]) => ({
      user_id,
      ...data,
    }));

  return problematicUsers;
}

export async function archiveUserTeamMembership(
  userId: string,
  teamId: string
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("team_members")
    .update({ left_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .is("left_at", null);

  if (error) throw error;
}

// Helper function to check if user is already in an active team
export async function isUserInActiveTeam(userId: string): Promise<{
  isInTeam: boolean;
  teamName?: string;
  teamId?: string;
}> {
  const supabase = createClient();

  const { data: membership, error } = await supabase
    .from("team_members")
    .select(
      `
      team_id,
      teams!inner(name)
    `
    )
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();

  if (error) throw error;

  return {
    isInTeam: !!membership,
    teamName: (membership?.teams as unknown as TeamRelation | undefined)?.name,
    teamId: membership?.team_id,
  };
}

// Check if user has active team membership (business rule: only one active team)
export async function getUserActiveTeam(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select(
      `
      team_id,
      joined_at,
      team_role,
      teams!inner(id, name, description, member_count)
    `
    )
    .eq("user_id", userId)
    .is("left_at", null);

  if (error) throw error;

  if (data && data.length > 1) {
    console.warn(
      `User ${userId} has multiple active teams: ${data
        .map((d) => (d.teams as unknown as TeamRelation).name)
        .join(", ")}`
    );
  }

  return data?.[0] || null; // Return first active team (should be only one)
}

// Validate team invitation (enforce one active team rule)
export async function validateTeamInvitation(userId: string) {
  const activeTeam = await getUserActiveTeam(userId);

  if (activeTeam) {
    return {
      valid: false,
      error: `User is already a member of "${
        (activeTeam.teams as unknown as TeamRelation).name
      }". Users can only be in one active team.`,
      currentTeam: activeTeam.teams,
    };
  }

  return { valid: true };
}

// Database cleanup: Keep most recent team membership and archive others
export async function cleanupMultipleTeamMemberships(dryRun: boolean = true) {
  const problematicUsers = await getUsersWithMultipleActiveTeams();
  const cleanupResults = [];

  for (const user of problematicUsers) {
    // Sort teams by joined_at desc (most recent first)
    const sortedTeams = user.teams.sort(
      (a, b) =>
        new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
    );

    const keepTeam = sortedTeams[0]; // Keep most recent
    const archiveTeams = sortedTeams.slice(1); // Archive the rest

    const result: {
      user_id: string;
      user_email: string;
      user_name: string | null;
      keepTeam: string;
      archiveTeams: string[];
      totalTeams: number;
      error?: string;
    } = {
      user_id: user.user_id,
      user_email: user.user.email,
      user_name: user.user.name,
      keepTeam: keepTeam.team_name,
      archiveTeams: archiveTeams.map((t) => t.team_name),
      totalTeams: sortedTeams.length,
    };

    if (!dryRun) {
      // Actually perform the cleanup
      for (const team of archiveTeams) {
        try {
          await archiveUserTeamMembership(user.user_id, team.team_id);
          console.log(
            `Archived ${user.user.email} from team "${team.team_name}"`
          );
        } catch (error) {
          console.error(
            `Failed to archive ${user.user.email} from team "${team.team_name}":`,
            error
          );
          result.error = `Failed to archive from ${team.team_name}`;
        }
      }
    }

    cleanupResults.push(result);
  }

  return {
    totalProblematicUsers: problematicUsers.length,
    dryRun,
    results: cleanupResults,
  };
}

// Leave all active teams (for cleanup purposes)
export async function leaveAllActiveTeams(userId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("team_members")
    .update({ left_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("left_at", null);

  if (error) throw error;
  return "Left all active teams";
}

// Client Meetings Functions (following golden rule - simple and clean!)
export async function getTeamClientMeetings(teamId: string) {
  const supabase = createClient();
  console.log("Loading client meetings for team:", teamId);

  try {
    // Using any cast since client_meetings table exists but not in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("client_meetings")
      .select(
        `
        id,
        client_name,
        status,
        created_at,
        completed_at,
        cancelled_at,
        responsible_user_id,
        client_type,
        call_type,
        how_it_went,
        new_things_learned,
        users:responsible_user_id (
          id,
          name,
          avatar_url
        )
      `
      )
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching client meetings:", error);
      throw error;
    }

    // Transform the data to match our expected interface
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data?.map((meeting: any) => ({
        id: meeting.id,
        client_name: meeting.client_name,
        status: meeting.status,
        created_at: meeting.created_at,
        completed_at: meeting.completed_at,
        cancelled_at: meeting.cancelled_at,
        responsible_user_id: meeting.responsible_user_id,
        client_type: meeting.client_type,
        call_type: meeting.call_type,
        how_it_went: meeting.how_it_went,
        new_things_learned: meeting.new_things_learned,
        users: {
          id: meeting.users?.id || "",
          name: meeting.users?.name || "Unknown User",
          avatar_url: meeting.users?.avatar_url || null,
        },
      })) || []
    );
  } catch (error) {
    console.error("Error in getTeamClientMeetings:", error);
    return [];
  }
}

export async function getMySubmittedTasksForReview(userId: string) {
  const supabase = createClient();

  // Get user's own tasks that have been submitted for review (includes completed, pending, approved, rejected)
  const { data, error } = await supabase
    .from("task_progress" as never)
    .select(
      `
      id,
      task_id,
      team_id,
      assigned_to_user_id,
      completed_at,
      submission_data,
      submission_notes,
      status,
      reviewer_user_id,
      tasks!inner(
        id,
        title,
        description,
        difficulty_level,
        base_xp_reward,
        base_points_reward,
        category
      ),
      teams!inner(
        id,
        name
      ),
      reviewer:users!task_progress_reviewer_user_id_fkey_public(
        id,
        name,
        avatar_url
      )
    `
    )
    .in("status", [
      "pending_review",
      "approved",
      "rejected",
      "revision_required",
    ])
    .eq("context", "team")
    .eq("assigned_to_user_id", userId);
  // Removed completed_at filter - rejected tasks have NULL completed_at but should still show

  if (error) {
    console.error("Error fetching my submitted tasks:", error);
    throw error;
  }

  return data || [];
}

// Achievement System Types
interface SupabaseRpcClient {
  rpc(
    fn: "get_user_achievement_progress",
    params: { p_user_id: string }
  ): Promise<{ data: unknown; error: unknown }>;
  rpc(
    fn: "get_tasks_by_achievement",
    params: { p_achievement_id: string | null; p_team_id: string | null }
  ): Promise<{ data: unknown; error: unknown }>;
  rpc(
    fn: "check_and_award_achievement",
    params: { p_user_id: string; p_achievement_id: string }
  ): Promise<{ data: unknown; error: unknown }>;
}

// Achievement System Functions
export async function getUserAchievementProgress(userId: string) {
  const supabase = createClient();

  // Use proper type interface for RPC functions
  const { data, error } = await (supabase as unknown as SupabaseRpcClient).rpc(
    "get_user_achievement_progress",
    { p_user_id: userId }
  );

  if (error) {
    console.error("Error fetching user achievement progress:", error);
    throw error;
  }

  return data || [];
}

export async function getTasksByAchievement(
  achievementId?: string,
  teamId?: string
) {
  const supabase = createClient();

  // Use proper type interface for RPC functions
  const { data, error } = await (supabase as unknown as SupabaseRpcClient).rpc(
    "get_tasks_by_achievement",
    {
      p_achievement_id: achievementId || null,
      p_team_id: teamId || null,
    }
  );

  if (error) {
    console.error("Error fetching tasks by achievement:", error);
    throw error;
  }

  return data || [];
}

export async function checkAndAwardAchievement(
  userId: string,
  achievementId: string
) {
  const supabase = createClient();

  // Use proper type interface for RPC functions
  const { data, error } = await (supabase as unknown as SupabaseRpcClient).rpc(
    "check_and_award_achievement",
    {
      p_user_id: userId,
      p_achievement_id: achievementId,
    }
  );

  if (error) {
    console.error("Error checking/awarding achievement:", error);
    throw error;
  }

  return data;
}

/**
 * Get team achievements with progress tracking
 * Shows points/XP rewards divided by team member count for team context
 * Since this is viewed from team journey, all achievements shown are in team context
 */
export async function getTeamAchievements(teamId: string) {
  const supabase = createClient();

  // Get ONLY team achievements (context='team')
  const { data: achievements, error: achievementsError } = await supabase
    .from("achievements")
    .select(
      "id, name, description, icon, xp_reward, points_reward, sort_order, context"
    )
    .eq("context", "team") // Filter for team achievements only
    .order("sort_order", { ascending: true });

  if (achievementsError) {
    console.error("Error fetching achievements:", achievementsError);
    throw achievementsError;
  }

  // Get completed team achievements for this team
  const { data: completedTeamAchievements, error: teamAchError } =
    await supabase
      .from("team_achievements")
      .select("achievement_id")
      .eq("team_id", teamId);

  if (teamAchError) {
    console.error("Error fetching team achievements:", teamAchError);
    throw teamAchError;
  }

  const completedTeamAchievementIds = new Set(
    completedTeamAchievements?.map((ta) => ta.achievement_id) || []
  );

  // Get task progress for this team (only team context tasks)
  const { data: taskProgress, error: progressError } = await supabase
    .from("task_progress")
    .select("task_id, status")
    .eq("team_id", teamId)
    .eq("context", "team"); // Only count team tasks for team achievements

  if (progressError) {
    console.error("Error fetching task progress:", progressError);
    throw progressError;
  }

  // Get tasks to link with achievements (only team context tasks matter here)
  const { data: allTasksWithAchievements, error: tasksAchError } =
    await supabase.from("tasks").select("id, achievement_id");

  if (tasksAchError) {
    console.error("Error fetching tasks with achievements:", tasksAchError);
    throw tasksAchError;
  }

  // Create task_id -> achievement_id mapping
  const taskToAchievementMap = new Map<string, string>();
  allTasksWithAchievements?.forEach((task) => {
    if (task.achievement_id) {
      taskToAchievementMap.set(task.id, task.achievement_id);
    }
  });

  // Count tasks per achievement
  const progressMap = new Map<string, { total: number; completed: number }>();

  // Get all tasks for counting totals (all tasks, since achievements are hybrid)
  const { data: allTasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, achievement_id");

  if (tasksError) {
    console.error("Error fetching tasks:", tasksError);
    throw tasksError;
  }

  // Count total tasks per achievement
  allTasks?.forEach((task) => {
    if (task.achievement_id) {
      const current = progressMap.get(task.achievement_id) || {
        total: 0,
        completed: 0,
      };
      progressMap.set(task.achievement_id, {
        ...current,
        total: current.total + 1,
      });
    }
  });

  // Count completed AND in-progress TEAM tasks from team progress
  const inProgressMap = new Map<string, number>();
  taskProgress?.forEach((progress) => {
    const achievementId = taskToAchievementMap.get(progress.task_id);
    if (achievementId) {
      // Count completed tasks
      if (progress.status === "approved") {
        const current = progressMap.get(achievementId) || {
          total: 0,
          completed: 0,
        };
        progressMap.set(achievementId, {
          ...current,
          completed: current.completed + 1,
        });
      }
      // Count in-progress tasks
      if (progress.status === "in_progress") {
        inProgressMap.set(
          achievementId,
          (inProgressMap.get(achievementId) || 0) + 1
        );
      }
    }
  });

  // Transform to Achievement interface format
  const transformedAchievements =
    achievements?.map((ach) => {
      const progress = progressMap.get(ach.id) || { total: 0, completed: 0 };
      const hasInProgressTasks = (inProgressMap.get(ach.id) || 0) > 0;
      const isInProgress =
        hasInProgressTasks ||
        (progress.completed > 0 && progress.completed < progress.total);

      // Display TOTAL rewards (not divided) and check actual completion status from team_achievements table
      return {
        achievement_id: ach.id,
        achievement_name: ach.name,
        achievement_description: ach.description || "",
        achievement_icon: ach.icon || "trophy",
        xp_reward: ach.xp_reward || 0, // TOTAL value (will be split when awarded)
        credits_reward: ach.points_reward || 0, // TOTAL value (will be split when awarded)
        color_theme: "blue",
        sort_order: ach.sort_order || 0,
        total_tasks: progress.total,
        completed_tasks: progress.completed,
        status: completedTeamAchievementIds.has(ach.id)
          ? ("completed" as const)
          : isInProgress
          ? ("in-progress" as const)
          : ("not-started" as const),
        is_completed: completedTeamAchievementIds.has(ach.id),
      };
    }) || [];

  return transformedAchievements;
}

// My Journey Functions - User-specific data functions
export async function getUserStrikes(userId: string) {
  const supabase = createClient();

  // Get strikes for all teams the user belongs to
  const { data: strikes, error } = await supabase
    .from("team_strikes")
    .select(
      `
      id,
      title,
      description,
      created_at,
      explanation,
      xp_penalty,
      points_penalty,
      status,
      teams!inner(name)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user strikes:", error);
    throw error;
  }

  return strikes || [];
}

export async function getUserWeeklyReports(userId: string) {
  const supabase = createClient();

  // Get weekly reports submitted by the user for teams
  const { data: reports, error } = await supabase
    .from("weekly_reports")
    .select(
      `
      id,
      week_number,
      week_year,
      week_start_date,
      week_end_date,
      submitted_at,
      submission_data,
      teams!inner(name)
    `
    )
    .eq("user_id", userId)
    .eq("context", "team")
    .order("week_year", { ascending: false })
    .order("week_number", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching user weekly reports:", error);
    throw error;
  }

  return reports || [];
}

export async function getUserTaskCompletionStats(userId: string) {
  const supabase = createClient();

  // Get task completion statistics from task_progress (both individual and team tasks)
  const { data: stats, error } = await supabase
    .from("task_progress")
    .select("status")
    .or(`user_id.eq.${userId},assigned_to_user_id.eq.${userId}`);

  if (error) {
    console.error("Error fetching user task stats:", error);
    throw error;
  }

  const taskStats = stats || [];
  const total = taskStats.length;
  const completed = taskStats.filter(
    (task) => task.status === "approved" || task.status === "completed"
  ).length;

  return {
    total,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// ============================================================================
// INDIVIDUAL TASK FUNCTIONS (Phase 3)
// ============================================================================

/**
 * Get all individual tasks for a user
 */
export async function getUserIndividualTasks(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_user_individual_tasks", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Error fetching individual tasks:", error);
    throw error;
  }

  return data || [];
}

/**
 * Assign an individual task to a user
 */
export async function assignIndividualTask(userId: string, taskId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("assign_individual_task", {
    p_user_id: userId,
    p_task_id: taskId,
  });

  if (error) {
    console.error("Error assigning individual task:", error);
    throw error;
  }

  return data;
}

/**
 * Start an individual task
 */
export async function startIndividualTask(progressId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("start_individual_task", {
    p_progress_id: progressId,
  });

  if (error) {
    console.error("Error starting individual task:", error);
    throw error;
  }

  return data;
}

/**
 * Complete an individual task and award points
 */
export async function completeIndividualTask(
  progressId: string,
  submissionData?: Record<string, unknown>,
  submissionNotes?: string
) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("complete_individual_task", {
    p_progress_id: progressId,
    p_submission_data: submissionData as Json | undefined,
    p_submission_notes: submissionNotes,
  });

  if (error) {
    console.error("Error completing individual task:", error);
    throw error;
  }

  return data;
}

// ============================================================================
// TEAM TASK FUNCTIONS (Updated for task_progress)
// ============================================================================

/**
 * Get team tasks from task_progress table (replacement for old function)
 */
export async function getTeamTasksFromProgress(teamId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_team_tasks_from_progress", {
    p_team_id: teamId,
  });

  if (error) {
    console.error("Error fetching team tasks:", error);
    throw error;
  }

  return data || [];
}

/**
 * Assign a task to a team using task_progress table
 */
export async function assignTeamTaskToProgress(
  progressId: string,
  userId: string,
  teamId: string,
  taskId: string,
  assignedToUserId?: string,
  assignedByUserId?: string
) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("assign_team_task_to_progress", {
    p_progress_id: progressId,
    p_user_id: userId,
    p_team_id: teamId,
    p_task_id: taskId,
    p_assigned_to_user_id: assignedToUserId,
    p_assigned_by_user_id: assignedByUserId,
  });

  if (error) {
    console.error("Error assigning team task:", error);
    throw error;
  }

  return data;
}

/**
 * Get completed peer reviews given by the user (all individual review attempts)
 */
export async function getCompletedPeerReviews(userId: string) {
  const supabase = createClient();

  // Get all tasks where the user appears in peer_review_history with completed reviews
  const { data: taskProgressData, error } = await supabase
    .from("task_progress")
    .select(
      `
      id,
      task_id,
      team_id,
      assigned_to_user_id,
      completed_at,
      updated_at,
      submission_data,
      submission_notes,
      status,
      review_feedback,
      peer_review_history,
      tasks(
        id,
        title,
        description,
        difficulty_level,
        base_xp_reward,
        base_points_reward,
        category
      ),
      teams(
        id,
        name
      )
    `
    )
    .eq("context", "team")
    .not("peer_review_history", "is", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching completed peer reviews:", error);
    throw error;
  }

  if (!taskProgressData || taskProgressData.length === 0) {
    return [];
  }

  // Extract individual review entries from peer_review_history
  interface PeerReviewHistoryEntry {
    event_type: string;
    reviewer_id: string;
    feedback: string;
    decision: "approved" | "rejected";
    timestamp: string;
    reviewer_name: string;
    reviewer_avatar_url: string;
  }

  const individualReviews: Array<{
    id: string;
    task_id: string;
    team_id: string | null;
    assigned_to_user_id: string | null;
    completed_at: string;
    updated_at: string;
    submission_data: unknown;
    submission_notes: string | null;
    status: "approved" | "rejected";
    review_feedback: string;
    tasks: unknown;
    teams: unknown;
    review_index: number;
    total_reviews: number;
    reviewer_name: string;
    reviewer_avatar_url: string;
  }> = [];

  taskProgressData.forEach((task) => {
    if (task.peer_review_history && Array.isArray(task.peer_review_history)) {
      // Find all completed reviews by this user
      const userReviews = (task.peer_review_history as unknown as PeerReviewHistoryEntry[]).filter(
        (historyEntry: PeerReviewHistoryEntry) =>
          historyEntry.event_type === "review_completed" &&
          historyEntry.reviewer_id === userId &&
          historyEntry.feedback
      );

      // Create a separate entry for each review
      userReviews.forEach(
        (
          reviewEntry: PeerReviewHistoryEntry,
          index: number
        ) => {
          individualReviews.push({
            // Use unique ID combining task ID and review timestamp
            id: `${task.id}_${reviewEntry.timestamp}`,
            task_id: task.task_id,
            team_id: task.team_id,
            assigned_to_user_id: task.assigned_to_user_id,
            completed_at: reviewEntry.timestamp,
            updated_at: reviewEntry.timestamp,
            submission_data: task.submission_data,
            submission_notes: task.submission_notes,
            status: reviewEntry.decision, // 'approved' or 'rejected'
            review_feedback: reviewEntry.feedback,
            tasks: task.tasks,
            teams: task.teams,
            // Additional metadata for this specific review
            review_index: index,
            total_reviews: userReviews.length,
            reviewer_name: reviewEntry.reviewer_name,
            reviewer_avatar_url: reviewEntry.reviewer_avatar_url,
          });
        }
      );
    }
  });

  // Sort by review timestamp (most recent first)
  individualReviews.sort(
    (a, b) =>
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  );

  // Get all unique assigned user IDs
  const assignedUserIds = [
    ...new Set(
      individualReviews
        .map((review) => review.assigned_to_user_id)
        .filter((id) => id !== null)
    ),
  ];

  // Fetch user data separately
  let usersData: Array<{
    id: string;
    name: string | null;
    avatar_url: string | null;
  }> = [];
  if (assignedUserIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", assignedUserIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
    } else {
      usersData = users || [];
    }
  }

  // Combine the data with assigned user info
  const combinedData = individualReviews.map((review) => ({
    ...review,
    assigned_user: review.assigned_to_user_id
      ? usersData.find((user) => user.id === review.assigned_to_user_id) || null
      : null,
  }));

  return combinedData;
}

// Rich content interfaces
interface TipContent {
  title: string;
  content: string;
}

interface PeerReviewCriteria {
  category: string;
  points: string[];
}

interface ResourceItem {
  title: string;
  description: string;
  type: "documentation" | "video" | "article" | "tool" | "example";
  url?: string;
}

// Task creation types
interface CreateTaskParams {
  templateCode: string;
  title: string;
  description?: string;
  detailedInstructions?: string;
  category?:
    | "onboarding"
    | "development"
    | "design"
    | "marketing"
    | "business"
    | "testing"
    | "deployment"
    | "milestone";
  priority?: "low" | "medium" | "high" | "urgent";
  difficultyLevel?: number;
  estimatedHours?: number;
  baseXpReward?: number;
  basePointsReward?: number;
  requiresReview?: boolean;
  autoAssignToNewTeams?: boolean;
  achievementId?: string;
  taskContext?: "individual" | "team";
  // Rich content fields
  tipsContent?: TipContent[];
  peerReviewCriteria?: PeerReviewCriteria[];
  learningObjectives?: string[];
  deliverables?: string[];
  resources?: ResourceItem[];
  reviewInstructions?: string;
  tags?: string[];
  sortOrder?: number;
  prerequisiteTemplateCodes?: string[];
  minimumTeamLevel?: number;
}

/**
 * Create a new task template (lazy progress architecture - NO pre-assignment)
 */
export async function createTask(params: CreateTaskParams) {
  const supabase = createClient();

  // Create task directly in tasks table WITHOUT pre-assignment
  const taskInsert = {
    template_code: params.templateCode,
    activity_type: params.taskContext || "team",
    title: params.title,
    description: params.description || null,
    detailed_instructions: params.detailedInstructions || null,
    category: params.category || "development",
    priority: params.priority || "medium",
    difficulty_level: params.difficultyLevel || 1,
    estimated_hours: params.estimatedHours || 0,
    base_xp_reward: params.baseXpReward || 0,
    base_points_reward: params.basePointsReward || 0,
    requires_review: params.requiresReview || false,
    tips_content: (params.tipsContent || []) as unknown as Json,
    peer_review_criteria: (params.peerReviewCriteria || []) as unknown as Json,
    learning_objectives: params.learningObjectives || null,
    deliverables: params.deliverables || null,
    resources: (params.resources || []) as unknown as Json,
    review_instructions: params.reviewInstructions || null,
    tags: params.tags || null,
    sort_order: params.sortOrder || 0,
    prerequisite_template_codes: params.prerequisiteTemplateCodes || null,
    minimum_team_level: params.minimumTeamLevel || 1,
    auto_assign_to_new_teams: params.autoAssignToNewTeams !== false,
    achievement_id: params.achievementId || null,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(taskInsert)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating task:", error);
    throw error;
  }

  return data;
}

/**
 * Delete a task template (admin only)
 */
export async function deleteTask(taskId: string) {
  const supabase = createClient();

  // Delete the task (this will cascade to related progress entries)
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    console.error("Error deleting task:", error);
    throw error;
  }

  return true;
}

/**
 * Update a task template (admin only)
 */
export async function updateTask(
  taskId: string,
  params: Partial<CreateTaskParams>
) {
  const supabase = createClient();

  const updateData: Record<string, unknown> = {};

  // Map parameters to database columns
  if (params.templateCode !== undefined)
    updateData.template_code = params.templateCode;
  if (params.title !== undefined) updateData.title = params.title;
  if (params.description !== undefined)
    updateData.description = params.description;
  if (params.detailedInstructions !== undefined)
    updateData.detailed_instructions = params.detailedInstructions;
  if (params.category !== undefined) updateData.category = params.category;
  if (params.priority !== undefined) updateData.priority = params.priority;
  if (params.difficultyLevel !== undefined)
    updateData.difficulty_level = params.difficultyLevel;
  if (params.estimatedHours !== undefined)
    updateData.estimated_hours = params.estimatedHours;
  if (params.baseXpReward !== undefined)
    updateData.base_xp_reward = params.baseXpReward;
  if (params.basePointsReward !== undefined)
    updateData.base_points_reward = params.basePointsReward;
  if (params.requiresReview !== undefined)
    updateData.requires_review = params.requiresReview;
  if (params.tipsContent !== undefined)
    updateData.tips_content = params.tipsContent;
  if (params.peerReviewCriteria !== undefined)
    updateData.peer_review_criteria = params.peerReviewCriteria;
  if (params.learningObjectives !== undefined)
    updateData.learning_objectives = params.learningObjectives;
  if (params.deliverables !== undefined)
    updateData.deliverables = params.deliverables;
  if (params.resources !== undefined) updateData.resources = params.resources;
  if (params.reviewInstructions !== undefined)
    updateData.review_instructions = params.reviewInstructions;
  if (params.tags !== undefined) updateData.tags = params.tags;
  if (params.sortOrder !== undefined) updateData.sort_order = params.sortOrder;
  if (params.prerequisiteTemplateCodes !== undefined)
    updateData.prerequisite_template_codes = params.prerequisiteTemplateCodes;
  if (params.minimumTeamLevel !== undefined)
    updateData.minimum_team_level = params.minimumTeamLevel;
  if (params.autoAssignToNewTeams !== undefined)
    updateData.auto_assign_to_new_teams = params.autoAssignToNewTeams;
  if (params.achievementId !== undefined)
    updateData.achievement_id = params.achievementId;
  if (params.taskContext !== undefined)
    updateData.activity_type = params.taskContext;

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", taskId)
    .select("id")
    .single();

  if (error) {
    console.error("Error updating task:", error);
    throw error;
  }

  return data;
}

/**
 * Get full task details for editing (includes all rich content fields)
 */
export async function getTaskForEdit(taskId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      `
      id,
      title,
      description,
      detailed_instructions,
      category,
      priority,
      difficulty_level,
      estimated_hours,
      base_xp_reward,
      base_points_reward,
      tips_content,
      peer_review_criteria,
      learning_objectives,
      deliverables,
      resources,
      review_instructions,
      tags,
      created_at,
      updated_at
    `
    )
    .eq("id", taskId)
    .single();

  if (error) {
    console.error("Error fetching task for edit:", error);
    throw error;
  }

  return data;
}

// ============================================================================
// NEW VISIBLE TASK FUNCTIONS (Phase 1 - Lazy Progress Model)
// ============================================================================

/**
 * Get team tasks using the new visible architecture (alongside existing functions)
 * Shows ALL active team tasks with lazy progress - only creates progress when needed
 */
export async function getTeamTasksVisible(teamId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_team_tasks_visible", {
    p_team_id: teamId,
  });

  if (error) {
    console.error("Error fetching team tasks visible:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get user tasks using the new visible architecture (alongside existing functions)
 * Shows ALL active individual tasks with lazy progress - only creates progress when needed
 */
export async function getUserTasksVisible(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_user_tasks_visible", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Error fetching user tasks visible:", error);
    throw error;
  }

  return data || [];
}

// ============================================================================
// RETRY WRAPPER FUNCTIONS - SAFE READ-ONLY OPERATIONS
// ============================================================================

/**
 * Retry wrapper for getUserProfile - safe for retries (read-only)
 */
export async function getUserProfileWithRetry(userId: string) {
  return withRetry(() => getUserProfile(userId));
}

/**
 * Retry wrapper for getUserTransactions - safe for retries (read-only)
 */
export async function getUserTransactionsWithRetry(userId: string, limit = 10) {
  return withRetry(() => getUserTransactions(userId, limit));
}

/**
 * Retry wrapper for getTeamDetails - safe for retries (read-only)
 */
export async function getTeamDetailsWithRetry(teamId: string) {
  return withRetry(() => getTeamDetails(teamId));
}

// ============================================================================
// RETRY WRAPPER FUNCTIONS - SAFE WRITE OPERATIONS
// ============================================================================

/**
 * Retry wrapper for createTeam - safe for retries (has built-in duplicate prevention)
 */
export async function createTeamWithRetry(
  founderId: string,
  teamName: string,
  description: string
) {
  return withRetry(() => createTeam(founderId, teamName, description));
}

/**
 * Retry wrapper for sendTeamInvitation - safe for retries (database constraints prevent duplicates)
 */
export async function sendTeamInvitationWithRetry(
  teamId: string,
  invitedUserEmail: string,
  inviterUserId: string,
  role: "member" | "leader" | "co_founder" = "member"
) {
  return withRetry(() =>
    sendTeamInvitation(teamId, invitedUserEmail, inviterUserId, role)
  );
}

/**
 * Helper function to create progress entry if needed (lazy creation)
 * Returns the progress_id (existing or newly created)
 */
export async function createProgressIfNeededDB(
  taskId: string,
  teamId?: string,
  userId?: string,
  context: "team" | "individual" = "team"
): Promise<string | null> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "create_progress_if_needed_v2",
    {
      p_task_id: taskId,
      p_team_id: teamId || null,
      p_user_id: userId || null,
      p_context: context,
    }
  );

  if (error) {
    console.error("Error creating progress if needed:", error);
    throw error;
  }

  return data;
}

// ============================================================================
// SMART SNAPSHOT LEADERBOARD SYSTEM (Phase 2)
// ============================================================================

/**
 * Type definition for leaderboard entry returned by database function
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
 * Get current leaderboard data with change indicators from previous week
 * Uses smart snapshot system for efficient weekly comparisons
 * 
 * @param limit - Number of top users to return (default: 50)
 * @param weekNumber - Specific week to view (optional, defaults to current week)
 * @param weekYear - Specific year to view (optional, defaults to current year)
 */
export async function getLeaderboardData(
  limit: number = 50,
  weekNumber?: number,
  weekYear?: number
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("get_leaderboard_data", {
      p_limit: limit,
      p_week_number: weekNumber || null,
      p_week_year: weekYear || null,
    });

    if (error) {
      console.error("Error fetching leaderboard data:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getLeaderboardData:", error);
    throw error;
  }
}

/**
 * Generate weekly leaderboard snapshots for all users
 * This is typically run automatically but can be triggered manually
 * 
 * @param weekNumber - Week number to generate snapshots for (optional, defaults to current week)
 * @param weekYear - Week year to generate snapshots for (optional, defaults to current year)
 */
export async function generateWeeklyLeaderboardSnapshots(
  weekNumber?: number,
  weekYear?: number
): Promise<{ success: boolean; message: string; usersProcessed: number }> {
  const supabase = createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("generate_weekly_leaderboard_snapshots", {
      p_week_number: weekNumber || null,
      p_week_year: weekYear || null,
    });

    if (error) {
      console.error("Error generating weekly snapshots:", error);
      throw error;
    }

    return data || { success: false, message: "Unknown error", usersProcessed: 0 };
  } catch (error) {
    console.error("Error in generateWeeklyLeaderboardSnapshots:", error);
    throw error;
  }
}

/**
 * Get available weeks for leaderboard viewing
 * Returns list of weeks that have snapshot data
 */
export async function getAvailableLeaderboardWeeks(): Promise<Array<{
  week_number: number;
  week_year: number;
  week_start: string;
  week_end: string;
  user_count: number;
}>> {
  const supabase = createClient();

  try {
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
    const weekMap = new Map<string, {
      week_number: number;
      week_year: number;
      user_count: number;
      created_at: string;
    }>();

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

    // Get week boundaries for each week
    const weeks = Array.from(weekMap.values());
    const weekBoundaries = await Promise.all(
      weeks.map(async (week) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: boundaries, error: boundariesError } = await (supabase as any).rpc(
            "get_riga_week_boundaries",
            { 
              input_date: `${week.week_year}-01-01` // Use year start to get week boundaries
            }
          );

          if (boundariesError || !boundaries || boundaries.length === 0) {
            // Fallback calculation if function fails
            const startOfYear = new Date(week.week_year, 0, 1);
            const daysOffset = (week.week_number - 1) * 7;
            const weekStart = new Date(startOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
            const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

            return {
              ...week,
              week_start: weekStart.toISOString().split('T')[0],
              week_end: weekEnd.toISOString().split('T')[0],
            };
          }

          // Find the matching week from boundaries
          const matchingWeek = boundaries.find(
            (b: { week_number: number; week_year: number }) =>
              b.week_number === week.week_number && b.week_year === week.week_year
          );

          if (matchingWeek) {
            return {
              ...week,
              week_start: matchingWeek.week_start,
              week_end: matchingWeek.week_end,
            };
          }

          // Fallback if no matching week found
          return {
            ...week,
            week_start: `${week.week_year}-01-01`,
            week_end: `${week.week_year}-01-07`,
          };
        } catch (error) {
          console.error("Error getting week boundaries:", error);
          return {
            ...week,
            week_start: `${week.week_year}-01-01`,
            week_end: `${week.week_year}-01-07`,
          };
        }
      })
    );

    return weekBoundaries;
  } catch (error) {
    console.error("Error in getAvailableLeaderboardWeeks:", error);
    throw error;
  }
}

/**
 * Get current week information using Riga timezone
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
    const { data, error } = await (supabase as any).rpc("get_riga_week_boundaries");

    if (error) {
      console.error("Error getting current week info:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error("No week boundaries returned");
    }

    return data[0];
  } catch (error) {
    console.error("Error in getCurrentWeekInfo:", error);
    throw error;
  }
}


