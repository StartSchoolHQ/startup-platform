/**
 * Peer Review Functions
 *
 * Handles:
 * - Available tasks for peer review
 * - Submitted tasks tracking
 * - Completed review history
 * - Review statistics
 */

import { createClient } from "../supabase/client";

/**
 * Get tasks available for peer review
 * Users can only review tasks from teams they are NOT members of
 */
export async function getAvailableTasksForReview(userId: string) {
  const supabase = createClient();

  // Get the user's active team
  const { data: userTeams, error: userTeamsError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .is("left_at", null);

  if (userTeamsError) {
    throw userTeamsError;
  }

  const userTeamIds = userTeams?.map((tm) => tm.team_id) || [];

  if (userTeamIds.length > 1) {
    console.warn(
      `User ${userId} is in multiple teams: ${userTeamIds.join(
        ", "
      )}. This should be cleaned up.`
    );
  }

  // Check if user is admin to determine confidential task access
  const { data: userProfile, error: userError } = await supabase
    .from("users")
    .select("primary_role")
    .eq("id", userId)
    .single();

  if (userError) {
    throw userError;
  }

  const isAdmin = userProfile?.primary_role === "admin";

  // Get tasks available for peer review (from teams user is NOT a member of)
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
        peer_review_criteria,
        is_confidential
      ),
      teams(
        id,
        name
      )
    `
    )
    .eq("status", "pending_review")
    .eq("context", "team")
    .is("reviewer_user_id", null);

  // Filter out confidential tasks for non-admin users
  if (!isAdmin) {
    query = query.eq("tasks.is_confidential", false);
  }

  // Users can only review tasks from teams they are NOT members of
  if (userTeamIds.length > 0) {
    userTeamIds.forEach((teamId) => {
      query = query.neq("team_id", teamId);
    });
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get user's own submitted tasks for review
 * Shows tasks the user submitted with their review status
 */
export async function getMySubmittedTasksForReview(userId: string) {
  const supabase = createClient();

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

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get completed peer reviews by the user
 * Shows BOTH approved AND rejected reviews immediately
 */
export async function getCompletedPeerReviews(userId: string) {
  const supabase = createClient();

  // Query all task_progress records that have this user in their peer_review_history
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
      const userReviews = (
        task.peer_review_history as unknown as PeerReviewHistoryEntry[]
      ).filter(
        (historyEntry: PeerReviewHistoryEntry) =>
          historyEntry.event_type === "review_completed" &&
          historyEntry.reviewer_id === userId &&
          (historyEntry.decision === "approved" ||
            historyEntry.decision === "rejected") &&
          historyEntry.feedback
      );

      // Create a separate entry for each review
      userReviews.forEach(
        (reviewEntry: PeerReviewHistoryEntry, index: number) => {
          individualReviews.push({
            id: `${task.id}_${reviewEntry.timestamp}`,
            task_id: task.task_id,
            team_id: task.team_id,
            assigned_to_user_id: task.assigned_to_user_id,
            completed_at: reviewEntry.timestamp,
            updated_at: reviewEntry.timestamp,
            submission_data: task.submission_data,
            submission_notes: task.submission_notes,
            status: reviewEntry.decision,
            review_feedback: reviewEntry.feedback,
            tasks: task.tasks,
            teams: task.teams,
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

  // Get assigned user data
  const assignedUserIds = [
    ...new Set(
      individualReviews
        .map((review) => review.assigned_to_user_id)
        .filter((id) => id !== null)
    ),
  ];

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

    if (!usersError) {
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

/**
 * Get submitted tasks history for a user
 * Shows tasks the user submitted and their review outcomes
 */
export async function getSubmittedTasksHistory(userId: string) {
  const supabase = createClient();

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
    .eq("assigned_to_user_id", userId)
    .eq("context", "team")
    .in("status", ["approved", "rejected"])
    .not("peer_review_history", "is", null)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return taskProgressData || [];
}
