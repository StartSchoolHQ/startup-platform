/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Miscellaneous Utility Functions
 *
 * Handles:
 * - Real-time subscriptions
 * - Team management operations (leave, remove, update)
 * - Data transformations
 * - Weekly reports
 * - Helper utilities
 */

import type { Product } from "@/types/team-journey";
import { createClient } from "../supabase/client";
import type { DatabaseTeam } from "./core";

/**
 * Subscribe to user updates (real-time)
 */
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

/**
 * Subscribe to user transactions (real-time)
 */
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

/**
 * Leave a team
 */
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

  // Clean up invitation records
  const { error: inviteCleanupError } = await supabase
    .from("team_invitations")
    .delete()
    .eq("team_id", teamId)
    .eq("invited_user_id", userId);

  if (inviteCleanupError) {
    // Don't throw - main operation succeeded
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

/**
 * Remove a team member (for team management)
 * Uses RPC v2: soft delete, hierarchy enforcement, invitation cleanup, member count - all in one atomic operation
 */
export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await (supabase.rpc as any)("remove_team_member_v2", {
    p_team_id: teamId,
    p_user_id: userId,
  });

  if (error) {
    // Map DB error messages to user-friendly messages
    if (error.message?.includes("founder")) {
      throw new Error(
        "Cannot remove team founder. Consider transferring ownership or disbanding the team."
      );
    }
    throw error;
  }
}

/**
 * Update team member role
 * Uses RPC v2: hierarchy enforcement, prevents founder promotion - all validated server-side
 */
export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  newRole: "member" | "leader" | "founder" | "co_founder"
): Promise<void> {
  const supabase = createClient();

  const { error } = await (supabase.rpc as any)("update_team_member_role_v2", {
    p_team_id: teamId,
    p_user_id: userId,
    p_new_role: newRole,
  });

  if (error) {
    throw error;
  }
}

/**
 * Update team details (name and/or description) - founder only
 */
export async function updateTeamDetails(
  teamId: string,
  founderId: string,
  updates: {
    name?: string;
    description?: string;
    website?: string;
  }
): Promise<void> {
  const supabase = createClient();

  // Verify the user is the founder
  const { data: teamCheck, error: checkError } = await supabase
    .from("teams")
    .select("founder_id, name")
    .eq("id", teamId)
    .eq("founder_id", founderId)
    .single();

  if (checkError || !teamCheck) {
    throw new Error(
      "You are not authorized to edit this team or the team does not exist."
    );
  }

  // Validate input data
  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (!trimmedName) {
      throw new Error("Team name cannot be empty.");
    }
    if (trimmedName.length < 2) {
      throw new Error("Team name must be at least 2 characters long.");
    }
    if (trimmedName.length > 100) {
      throw new Error("Team name must be less than 100 characters.");
    }
  }

  if (
    updates.description !== undefined &&
    updates.description &&
    updates.description.length > 500
  ) {
    throw new Error("Team description must be less than 500 characters.");
  }

  // Validate website URL if provided
  if (updates.website !== undefined && updates.website) {
    const trimmedWebsite = updates.website.trim();
    if (trimmedWebsite.length > 255) {
      throw new Error("Website URL must be less than 255 characters.");
    }
    try {
      new URL(
        trimmedWebsite.startsWith("http")
          ? trimmedWebsite
          : `https://${trimmedWebsite}`
      );
    } catch {
      throw new Error(
        "Please enter a valid website URL (e.g., example.com or https://example.com)."
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.website !== undefined)
    updateData.website = updates.website?.trim() || null;

  const { error } = await supabase
    .from("teams")
    .update(updateData)
    .eq("id", teamId)
    .eq("founder_id", founderId);

  if (error) {
    throw error;
  }
}

/**
 * Upload a team logo to Supabase storage
 * Returns the public URL of the uploaded logo
 */
export async function uploadTeamLogo(
  teamId: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  const fileExtension = file.name.split(".").pop() || "png";
  const filePath = `${teamId}/logo-${Date.now()}.${fileExtension}`;

  const { error: uploadError } = await supabase.storage
    .from("team-logos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload logo: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("team-logos").getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Update team details V2 — adds logo_url support
 * Leaves original updateTeamDetails untouched for rollback safety
 */
export async function updateTeamDetailsV2(
  teamId: string,
  founderId: string,
  updates: {
    name?: string;
    description?: string;
    website?: string;
    logo_url?: string | null;
  }
): Promise<void> {
  const supabase = createClient();

  // Verify the user is the founder
  const { data: teamCheck, error: checkError } = await supabase
    .from("teams")
    .select("founder_id, name")
    .eq("id", teamId)
    .eq("founder_id", founderId)
    .single();

  if (checkError || !teamCheck) {
    throw new Error(
      "You are not authorized to edit this team or the team does not exist."
    );
  }

  // Validate input data
  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    if (!trimmedName) throw new Error("Team name cannot be empty.");
    if (trimmedName.length < 2)
      throw new Error("Team name must be at least 2 characters long.");
    if (trimmedName.length > 100)
      throw new Error("Team name must be less than 100 characters.");
  }

  if (
    updates.description !== undefined &&
    updates.description &&
    updates.description.length > 500
  ) {
    throw new Error("Team description must be less than 500 characters.");
  }

  if (updates.website !== undefined && updates.website) {
    const trimmedWebsite = updates.website.trim();
    if (trimmedWebsite.length > 255)
      throw new Error("Website URL must be less than 255 characters.");
    try {
      new URL(
        trimmedWebsite.startsWith("http")
          ? trimmedWebsite
          : `https://${trimmedWebsite}`
      );
    } catch {
      throw new Error(
        "Please enter a valid website URL (e.g., example.com or https://example.com)."
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.website !== undefined)
    updateData.website = updates.website?.trim() || null;
  if (updates.logo_url !== undefined) updateData.logo_url = updates.logo_url;

  const { error } = await supabase
    .from("teams")
    .update(updateData)
    .eq("id", teamId)
    .eq("founder_id", founderId);

  if (error) throw error;
}

/**
 * Disband team (remove ALL members including founder)
 */
export async function disbandTeam(teamId: string): Promise<void> {
  await archiveTeamAndDisbandMembers(teamId);
}

/**
 * Archive team and disband all members (including founder)
 */
export async function archiveTeamAndDisbandMembers(teamId: string) {
  const supabase = createClient();

  try {
    const { error } = await (supabase.rpc as any)("disband_all_team_members", {
      team_id_param: teamId,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    throw error;
  }
}

/**
 * Get users with multiple active team memberships (for cleanup)
 */
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
    (acc: Record<string, UserTeamData>, member: any) => {
      if (!acc[member.user_id]) {
        acc[member.user_id] = {
          user: member.users as any,
          teams: [],
        };
      }
      acc[member.user_id].teams.push({
        team_id: member.team_id,
        team_name: (member.teams as any).name,
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

/**
 * Archive user team membership
 */
export async function archiveUserTeamMembership(
  userId: string,
  teamId: string
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("team_members")
    .update({ left_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("team_id", teamId);

  if (error) throw error;

  return true;
}

/**
 * Get user weekly reports
 */
export async function getUserWeeklyReports(userId: string) {
  const supabase = createClient();

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
    throw error;
  }

  return reports || [];
}

/**
 * Get user strikes
 */
export async function getUserStrikes(userId: string) {
  const supabase = createClient();

  const { data: strikes, error } = await supabase
    .from("team_strikes")
    .select(
      `
      id,
      reason,
      explanation,
      status,
      created_at,
      resolved_at,
      teams!inner(id, name)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return strikes || [];
}

/**
 * Transform database team to Product interface
 */
export function transformTeamToProduct(
  team: DatabaseTeam,
  currentUserId?: string
): Product {
  const totalRevenue =
    team.revenue_streams?.reduce(
      (sum: number, stream: { mrr_amount: number; verified: boolean }) =>
        sum + (stream.verified ? Number(stream.mrr_amount) : 0),
      0
    ) || 0;

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

  const totalTeamXP =
    team.team_members?.reduce(
      (sum: number, member) => sum + (member.users?.total_xp || 0),
      0
    ) || 0;

  const actualTeamSize = team.team_members?.length || 0;

  const isCurrentUserMember = currentUserId
    ? team.team_members?.some((member) => member.user_id === currentUserId) ||
      false
    : false;

  return {
    id: team.id,
    name: team.name,
    description: team.description || "No description provided",
    website: team.website || undefined,
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
    avatar: team.logo_url || "/avatars/suppdocs.jpg",
    logoUrl: team.logo_url || undefined,
    teamMembers,
    isCurrentUserMember,
  };
}
