/**
 * Database Access Layer - Modular Architecture
 *
 * This file serves as the public API facade for all database operations.
 * The implementation has been refactored into focused, domain-specific modules.
 *
 * Modules:
 * - core.ts: Shared utilities, types, retry logic
 * - users.ts: User profiles, transactions, statistics
 * - teams.ts: Team management, statistics, journey
 * - tasks.ts: Task CRUD, visibility, assignment
 * - reviews.ts: Peer review system
 * - achievements.ts: Achievement tracking and awards
 * - invitations.ts: Team invitation management
 * - notifications.ts: User notifications
 * - leaderboard.ts: Leaderboard snapshots and rankings
 * - utilities.ts: Subscriptions, helpers, transformations
 *
 * All exports maintain backward compatibility - no breaking changes.
 */

// ============================================================================
// CORE UTILITIES & TYPES
// ============================================================================
export {
  withRetry,
  debugAuthStatus,
  type TeamRelation,
  type UserRelation,
  type DatabaseTeam,
} from "./data/core";

// ============================================================================
// USER FUNCTIONS
// ============================================================================
export {
  getUserProfile,
  getUserTransactions,
  getPeerReviewStatsFromTransactions,
  getIndividualXPAndCredits,
  getIndividualActivityStats,
  getUserTeams,
  isUserTeamMember,
  getUserTeamRole,
} from "./data/users";

// ============================================================================
// TEAM FUNCTIONS
// ============================================================================
export {
  getTeamDetails,
  getTeamPointsInvested,
  getTeamPointsEarned,
  getTeamXPEarned,
  getTeamStatsCombined,
  getTeamActivityStats,
  getUserTeamStats,
  createTeam,
  getAllTeamsForJourney,
  getUserTeamsForJourney,
  getArchivedTeamsForJourney,
  getTeamStrikes,
  getAdminStrikes,
  rejectStrike,
  getTeamWeeklyReports,
  getTeamClientMeetings,
} from "./data/teams";

// ============================================================================
// TASK FUNCTIONS
// ============================================================================
export {
  getUserTaskCompletionStats,
  getUserIndividualTasks,
  assignIndividualTask,
  startIndividualTask,
  completeIndividualTask,
  getTeamTasksFromProgress,
  assignTeamTaskToProgress,
  getTeamTasksVisible,
  getUserTasksVisible,
  createProgressIfNeededDB,
  createTask,
  updateTask,
  deleteTask,
  getTaskForEdit,
  type PeerReviewCriteria,
  type ResourceItem,
  type TipContent,
  type CreateTaskParams,
} from "./data/tasks";

// ============================================================================
// PEER REVIEW FUNCTIONS
// ============================================================================
export {
  getAvailableTasksForReview,
  getMySubmittedTasksForReview,
  getCompletedPeerReviews,
  getSubmittedTasksHistory,
} from "./data/reviews";

// ============================================================================
// ACHIEVEMENT FUNCTIONS
// ============================================================================
export {
  getUserAchievementProgress,
  getTasksByAchievement,
  checkAndAwardAchievement,
  getTeamAchievementDashboard,
  getTeamAchievements,
} from "./data/achievements";

// ============================================================================
// INVITATION FUNCTIONS
// ============================================================================
export {
  sendTeamInvitation,
  sendTeamInvitationById,
  getPendingInvitations,
  getSentInvitations,
  respondToInvitation,
  getInvitationCount,
  getAvailableUsersForInvitation,
  getInvitationAvailabilityStats,
} from "./data/invitations";

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================
export {
  getUserNotifications,
  getNotificationCount,
  markNotificationSeen,
  type Notification,
} from "./data/notifications";

// ============================================================================
// LEADERBOARD FUNCTIONS
// ============================================================================
export {
  getLeaderboardData,
  generateWeeklyLeaderboardSnapshots,
  getCurrentWeekInfo,
  getAvailableLeaderboardWeeks,
  type LeaderboardEntry,
} from "./data/leaderboard";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
export {
  subscribeToUserUpdates,
  subscribeToUserTransactions,
  leaveTeam,
  removeTeamMember,
  updateTeamMemberRole,
  updateTeamDetails,
  updateTeamDetailsV2,
  uploadTeamLogo,
  disbandTeam,
  archiveTeamAndDisbandMembers,
  getUsersWithMultipleActiveTeams,
  archiveUserTeamMembership,
  getUserWeeklyReports,
  getUserStrikes,
  transformTeamToProduct,
} from "./data/utilities";

// ============================================================================
// RETRY WRAPPERS (for backward compatibility)
// ============================================================================
import { withRetry } from "./data/core";
import { getUserProfile, getUserTransactions } from "./data/users";
import { getTeamDetails, createTeam } from "./data/teams";
import { sendTeamInvitation } from "./data/invitations";

export async function getUserProfileWithRetry(userId: string) {
  return withRetry(() => getUserProfile(userId));
}

export async function getUserTransactionsWithRetry(userId: string, limit = 10) {
  return withRetry(() => getUserTransactions(userId, limit));
}

export async function getTeamDetailsWithRetry(teamId: string) {
  return withRetry(() => getTeamDetails(teamId));
}

export async function createTeamWithRetry(
  founderId: string,
  teamName: string,
  description: string
) {
  return withRetry(() => createTeam(founderId, teamName, description));
}

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
