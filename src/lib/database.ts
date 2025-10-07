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
    .single();

  if (error) {
    // If no record found, user is not a team member
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
    .single();

  if (error) {
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
    .is("team_members.left_at", null)
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

// Disband team (remove all members except founder and mark team as archived)
export async function disbandTeam(teamId: string): Promise<void> {
  const supabase = createClient();

  // Remove all team members except founder
  const { error: membersError } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .neq("team_role", "founder");

  if (membersError) {
    console.error("Error removing team members:", membersError);
    throw membersError;
  }

  // Archive the team and set member count to 1 (only founder)
  const { error: teamError } = await supabase
    .from("teams")
    .update({
      status: "archived",
      member_count: 1,
    })
    .eq("id", teamId);

  if (teamError) {
    console.error("Error archiving team:", teamError);
    throw teamError;
  }
}

// Get all users in the app (excluding current team members)
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

  // Then get all users excluding team members and pending invitations
  let query = supabase
    .from("users")
    .select("id, name, email, avatar_url, graduation_level")
    .not("id", "in", `(${memberIds.join(",")})`);

  // Add search filter if provided
  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
  }

  const { data: users, error } = await query.limit(20);

  if (error) throw error;

  // Filter out users who already have pending invitations
  const { data: pendingInvitations, error: invitationsError } = await supabase
    .from("team_invitations")
    .select("invited_user_id")
    .eq("team_id", teamId)
    .eq("status", "pending");

  if (invitationsError) throw invitationsError;

  const pendingUserIds =
    pendingInvitations?.map((inv) => inv.invited_user_id) || [];

  return users?.filter((user) => !pendingUserIds.includes(user.id)) || [];
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
