/**
 * Team Management Functions
 *
 * Handles:
 * - Team creation and management
 * - Team membership and roles
 * - Team statistics and analytics
 * - Team journey/products
 * - Team strikes and weekly reports
 */

import { createClient } from "../supabase/client";
import type { TeamRelation } from "./core";

/**
 * OPTIMIZED: Get team details with members in single query using JOIN
 * Reduces 2 separate queries to 1 (50% improvement)
 */
export async function getTeamDetails(teamId: string) {
  const supabase = createClient();

  // Single query with JOIN - fetch team and members together
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select(
      `
      *,
      members:team_members!inner(
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
      )
    `
    )
    .eq("id", teamId)
    .is("team_members.left_at", null)
    .single();

  if (teamError) throw teamError;

  return team;
}

/**
 * Get team points invested (total negative point transactions)
 */
export async function getTeamPointsInvested(teamId: string) {
  const supabase = createClient();

  const { data: investmentTransactions, error } = await supabase
    .from("transactions")
    .select("points_change")
    .eq("team_id", teamId)
    .lt("points_change", 0); // Only negative transactions (investments)

  if (error) {
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

/**
 * Get total team points earned from all team activities
 */
export async function getTeamPointsEarned(teamId: string) {
  const supabase = createClient();

  const { data: earnedTransactions, error } = await supabase
    .from("transactions")
    .select("points_change")
    .eq("team_id", teamId)
    .gt("points_change", 0); // Only positive transactions (earnings)

  if (error) {
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

/**
 * Get total team XP earned
 */
export async function getTeamXPEarned(teamId: string) {
  const supabase = createClient();

  const { data: earnedTransactions, error } = await supabase
    .from("transactions")
    .select("xp_change")
    .eq("team_id", teamId)
    .gt("xp_change", 0); // Only positive transactions (earnings)

  if (error) {
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

/**
 * OPTIMIZED: Get all team stats in one query (replaces 3 separate queries)
 */
export async function getTeamStatsCombined(teamId: string): Promise<{
  pointsInvested: number;
  pointsEarned: number;
  xpEarned: number;
}> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "get_team_stats_combined",
    { p_team_id: teamId }
  );

  if (error) {
    return { pointsInvested: 0, pointsEarned: 0, xpEarned: 0 };
  }

  // RPC returns array with single row
  const stats = data?.[0] || {};

  return {
    pointsInvested: stats.points_invested || 0,
    pointsEarned: stats.points_earned || 0,
    xpEarned: stats.xp_earned || 0,
  };
}

/**
 * Get team activity statistics for a specific user
 */
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

/**
 * Get user's team statistics (memberships, revenue streams, MRR)
 */
export async function getUserTeamStats(userId: string) {
  const supabase = createClient();
  const { data: teamMemberships, error: teamError } = await supabase
    .from("team_members")
    .select("team_id, team_role")
    .eq("user_id", userId)
    .is("left_at", null); // Only active memberships

  if (teamError) {
    throw teamError;
  }

  const { data: revenueStreams, error: revenueError } = await supabase
    .from("revenue_streams")
    .select("id, product_name, mrr_amount, type, verified")
    .eq("user_id", userId);

  if (revenueError) {
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

/**
 * Create a new team
 * Validates user is not already in a team and has sufficient credits
 */
export async function createTeam(
  founderId: string,
  teamName: string,
  description: string
) {
  const supabase = createClient();

  // Use atomic RPC function for team creation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("create_team_atomic", {
    p_founder_id: founderId,
    p_team_name: teamName,
    p_description: description,
  });

  if (error) throw error;
  return data;
}

/**
 * Get all teams for team journey view (admin/global view)
 */
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
      website,
      logo_url,
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

/**
 * Get user's teams for team journey view (filtered to user's teams only)
 */
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
      website,
      logo_url,
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

/**
 * Get archived teams for team journey view
 */
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
      website,
      logo_url,
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

/**
 * Get team strikes using RPC function
 */
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
    throw error;
  }

  return data || [];
}

/**
 * Admin: Get all strikes with optional filtering
 */
export async function getAdminStrikes(filter?: "pending" | "resolved" | "all") {
  const supabase = createClient();

  let query = supabase
    .from("team_strikes")
    .select(
      `
      *,
      teams!inner(id, name),
      strike_user:users!user_id(id, name, email)
    `
    )
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.not("explanation", "is", null).is("resolved_at", null);
  } else if (filter === "resolved") {
    query = query.not("resolved_at", "is", null);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Admin: Resolve a strike
 */
export async function resolveStrike(strikeId: string, adminUserId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("team_strikes")
    .update({
      resolved_by_user_id: adminUserId,
      resolved_at: new Date().toISOString(),
      status: "resolved",
    })
    .eq("id", strikeId)
    .select("user_id, team_id")
    .single();

  if (error) throw error;

  // Decrement team's strikes_count
  if (data?.team_id) {
    // @ts-expect-error - Custom RPC function not in generated types
    await supabase.rpc("decrement_team_strikes_count", {
      team_id_param: data.team_id,
    });
  }

  return data;
}

/**
 * Get team weekly reports
 */
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
    throw error;
  }

  return data || [];
}

/**
 * Get client meetings for a team
 * Uses secure database function that handles permissions and masking
 */
export async function getTeamClientMeetings(teamId: string, userId: string) {
  const supabase = createClient();

  try {
    // Use the secure database function that handles permissions at database level
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_team_client_meetings_secure",
      {
        p_team_id: teamId,
        p_user_id: userId,
      }
    );

    if (error) {
      throw error;
    }

    // Transform the data to match our expected interface
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data?.map((meeting: any) => ({
        id: meeting.id,
        client_name: meeting.client_name, // Already masked at database level if needed
        status: meeting.status,
        created_at: meeting.created_at,
        completed_at: meeting.completed_at,
        cancelled_at: meeting.cancelled_at,
        responsible_user_id: meeting.responsible_user_id,
        client_type: meeting.client_type,
        call_type: meeting.call_type,
        how_it_went: meeting.how_it_went,
        new_things_learned: meeting.new_things_learned,
        meeting_data: meeting.meeting_data, // New JSONB field with 7-question template data
        is_client_name_masked: meeting.is_client_name_masked, // New field to indicate masking
        users: {
          id: meeting.user_id || "",
          name: meeting.user_name || "Unknown User",
          avatar_url: meeting.user_avatar_url || null,
        },
      })) || []
    );
  } catch (error) {
    return [];
  }
}
