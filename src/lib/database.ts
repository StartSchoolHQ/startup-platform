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
  team_members?: {
    user_id: string;
    team_role: "member" | "leader" | "founder" | "co_founder";
    users?: {
      id: string;
      name: string | null;
      avatar_url: string | null;
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
      task:tasks(name),
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
        graduation_level
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
          avatar_url
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
          avatar_url
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
          avatar_url
        )
      ),
      revenue_streams (
        mrr_amount,
        verified
      )
    `
    )
    .eq("team_members.user_id", userId)
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

  // Transform team members to expected format
  const teamMembers =
    team.team_members?.map(
      (member: {
        user_id: string;
        team_role: "member" | "leader" | "founder" | "co_founder";
        users?: { id: string; name: string | null; avatar_url: string | null };
      }) => ({
        id: member.users?.id || member.user_id,
        name: member.users?.name || "Unknown User",
        avatar: member.users?.avatar_url || "/avatars/john-doe.jpg",
      })
    ) || [];

  // Calculate points based on achievements (placeholder logic)
  const points = {
    amount: totalRevenue * 10, // Simplified calculation
    label: "Points Received",
  };

  return {
    id: team.id,
    name: team.name,
    description: team.description || "No description provided",
    status: team.status === "active" ? "Active" : "Inactive",
    customers: {
      count: team.member_count || 0,
      label: "Team Members",
    },
    revenue: {
      amount: totalRevenue,
      label: "Monthly Revenue",
    },
    points,
    avatar: "/avatars/suppdocs.jpg", // Default avatar for now
    teamMembers,
  };
}
