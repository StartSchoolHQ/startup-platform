/**
 * Invitation Management Functions
 *
 * Handles:
 * - Team invitations (send, respond, track)
 * - User availability for invitations
 * - Invitation statistics
 */

import { createClient } from "../supabase/client";
import type { TeamRelation } from "./core";

/**
 * Send team invitation by email
 */
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
    if (
      error instanceof Error &&
      error.message.startsWith("Cannot send invitation:")
    ) {
      throw error;
    }
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

/**
 * Send team invitation by user ID
 */
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
    throw new Error("Failed to create invitation");
  }

  return {
    success: true,
    message: `Invitation sent to ${invitedUser.name || invitedUser.email}`,
  };
}

/**
 * Get pending invitations for a user
 */
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

/**
 * Get sent invitations for a user
 */
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

/**
 * Respond to a team invitation (accept/decline)
 */
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

  // If accepting, check team membership BEFORE any database changes
  if (response === "accepted") {
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
      .eq("user_id", userId)
      .is("left_at", null)
      .limit(1);

    if (membershipError) {
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

    // Validation passed - now make database changes atomically

    // First: Add user to team_members (this will trigger auto-decline of other invitations)
    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: invitation.team_id,
      user_id: userId,
      team_role: invitation.role,
    });

    if (memberError) {
      // Handle unique constraint violation with clearer error message
      if (memberError.message?.includes("unique_active_user_membership")) {
        throw new Error(
          "You are already a member of another team. Please leave your current team first."
        );
      }
      throw new Error("Failed to add you to the team. Please try again.");
    }

    // Second: Update invitation status to "accepted"
    const { error: updateError } = await supabase
      .from("team_invitations")
      .update({
        status: response,
        responded_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    if (updateError) {
      // User is already in team but invitation status not updated
      // This is not critical - the important part (team membership) succeeded
    }

    // Third: Increment team member count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: countError } = await (supabase as any).rpc(
      "increment_team_member_count",
      {
        team_id: invitation.team_id,
      }
    );

    if (countError) {
      throw new Error("Failed to update team member count. Please try again.");
    }
  } else {
    // For declined invitations, just update the status
    const { error: updateError } = await supabase
      .from("team_invitations")
      .update({
        status: response,
        responded_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    if (updateError) {
      throw new Error("Failed to update invitation status. Please try again.");
    }
  }

  return { success: true };
}

/**
 * Get count of pending invitations for a user
 */
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

/**
 * Get users available for team invitation
 * Excludes users already in teams, current team members, and those with pending invitations
 */
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

  // Use RPC function to get available users
  // This bypasses PostgREST limitation with auth.users access
  const { data, error } = await (supabase as any).rpc(
    "get_available_users_for_invitation",
    {
      p_team_id: teamId,
      p_search_term: searchTerm || "",
    }
  );

  if (error) throw error;

  return data || [];
}

/**
 * Get invitation availability statistics
 */
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
