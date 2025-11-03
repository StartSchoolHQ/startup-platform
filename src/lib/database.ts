import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types/team-journey";

// Database type interfaces
interface DatabaseTeam {
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
      total_credits: number;
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

  // Get all validation type transactions (peer review rewards)
  const { data: validationTransactions, error } = await supabase
    .from("transactions")
    .select("xp_change, credits_change, created_at")
    .eq("user_id", userId)
    .eq("type", "validation")
    .gte("xp_change", 0); // Only positive rewards (not penalties)

  if (error) {
    console.error("Error fetching peer review transactions:", error);
    throw error;
  }

  const transactions = validationTransactions || [];

  // Calculate totals
  const totalXpEarned = transactions.reduce(
    (sum, t) => sum + (t.xp_change || 0),
    0
  );
  const totalPointsEarned = transactions.reduce(
    (sum, t) => sum + (t.credits_change || 0),
    0
  );
  const tasksReviewedCount = transactions.length;

  return {
    tasksReviewedByUser: tasksReviewedCount,
    totalXpEarned,
    totalPointsEarned,
  };
}

// Simple function to get team strikes
export async function getTeamStrikes(teamId: string) {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_team_strikes", {
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
    mrr_amount: number;
    type: string;
    verified: boolean;
  }

  return {
    teamsCount: teamMemberships?.length || 0,
    revenueStreamsCount: revenueStreams?.length || 0,
    totalMRR:
      revenueStreams?.reduce(
        (sum: number, stream: RevenueStream) => sum + Number(stream.mrr_amount),
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
      const teamName = existingMembership[0].teams?.name || "Unknown Team";
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
    .select("total_credits")
    .eq("id", founderId)
    .single();

  if (userError) {
    console.error("Error fetching user:", userError);
    throw userError;
  }

  console.log("User credits:", user?.total_credits);

  if (!user || user.total_credits < TEAM_CREATION_COST) {
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
    .update({ total_credits: user.total_credits - TEAM_CREATION_COST })
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
      type: "team_cost",
      credits_change: -TEAM_CREATION_COST,
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
        total_credits
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
          total_credits
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
          total_credits
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
          total_credits
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
  const { error: countError } = await supabase.rpc(
    "decrement_team_member_count",
    { team_id: teamId }
  );

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
export function transformTeamToProduct(team: DatabaseTeam): Product {
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
          total_credits: number;
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
      const teamName = existingMembership[0].teams?.name || "Unknown Team";
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
      invited_by:users!team_invitations_invited_by_user_id_fkey (
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
      invited_user:users!team_invitations_invited_user_id_fkey (
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
        const teamName = existingMembership[0].teams?.name || "Unknown Team";
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
    const { error: countError } = await supabase.rpc(
      "increment_team_member_count",
      {
        team_id: invitation.team_id,
      }
    );

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
    .from("team_task_progress" as never)
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
          user: member.users,
          teams: [],
        };
      }
      acc[member.user_id].teams.push({
        team_id: member.team_id,
        team_name: member.teams.name,
        joined_at: member.joined_at,
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
    teamName: membership?.teams?.name,
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
        .map((d) => d.teams.name)
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
      error: `User is already a member of "${activeTeam.teams.name}". Users can only be in one active team.`,
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
    .from("team_task_progress" as never)
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
        category
      ),
      teams!inner(
        id,
        name
      ),
      reviewer:users!reviewer_user_id(
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
      credits_penalty,
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

  // Get weekly reports submitted by the user
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

  // Get task completion statistics
  const { data: stats, error } = await supabase
    .from("team_task_progress")
    .select("status")
    .eq("assigned_to_user_id", userId);

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
