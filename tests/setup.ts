/**
 * Test Setup and Utilities
 *
 * This file provides helpers for creating and cleaning up test data.
 * All test data uses identifiable prefixes for safe cleanup.
 */

import { config } from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, afterAll, afterEach } from "vitest";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Test data prefix - makes cleanup safe and easy
export const TEST_PREFIX = "test_";
export const TEST_EMAIL_DOMAIN = "@test.local";

// Supabase client with service role (bypasses RLS)
let supabaseAdmin: SupabaseClient;

// Track all created test data for cleanup
interface TestData {
  users: string[];
  teams: string[];
  taskProgress: string[];
  transactions: string[];
  teamMembers: { team_id: string; user_id: string }[];
  clientMeetings: string[];
  teamAchievements: string[];
  weeklyReports: string[];
}

const testData: TestData = {
  users: [],
  teams: [],
  taskProgress: [],
  transactions: [],
  teamMembers: [],
  clientMeetings: [],
  teamAchievements: [],
  weeklyReports: [],
};

// Initialize Supabase client
beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
    );
  }

  supabaseAdmin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
});

// Clean up after each test
afterEach(async () => {
  await cleanupTestData();
});

// Final cleanup after all tests
afterAll(async () => {
  await cleanupTestData();
  // Extra safety: clean any orphaned test data
  await cleanupOrphanedTestData();
});

/**
 * Clean up all tracked test data
 */
async function cleanupTestData() {
  const sb = getAdminClient();

  // Delete in correct order (respecting foreign keys)

  // 1. Transactions (references users, teams)
  if (testData.transactions.length > 0) {
    await sb.from("transactions").delete().in("id", testData.transactions);
    testData.transactions = [];
  }

  // 2. Task progress (references users, teams, tasks)
  if (testData.taskProgress.length > 0) {
    await sb.from("task_progress").delete().in("id", testData.taskProgress);
    testData.taskProgress = [];
  }

  // 3. Team achievements (references teams, achievements)
  if (testData.teamAchievements.length > 0) {
    await sb
      .from("team_achievements")
      .delete()
      .in("id", testData.teamAchievements);
    testData.teamAchievements = [];
  }

  // 4. Weekly reports (references users, teams)
  if (testData.weeklyReports.length > 0) {
    await sb.from("weekly_reports").delete().in("id", testData.weeklyReports);
    testData.weeklyReports = [];
  }

  // 5. Client meetings (references teams, users)
  if (testData.clientMeetings.length > 0) {
    await sb.from("client_meetings").delete().in("id", testData.clientMeetings);
    testData.clientMeetings = [];
  }

  // 6. Team members (references teams, users)
  for (const tm of testData.teamMembers) {
    await sb
      .from("team_members")
      .delete()
      .eq("team_id", tm.team_id)
      .eq("user_id", tm.user_id);
  }
  testData.teamMembers = [];

  // 7. Teams (after team_members removed)
  if (testData.teams.length > 0) {
    await sb.from("teams").delete().in("id", testData.teams);
    testData.teams = [];
  }

  // 8. Users (last, after all references removed)
  if (testData.users.length > 0) {
    await sb.from("users").delete().in("id", testData.users);
    testData.users = [];
  }
}

/**
 * Clean any orphaned test data (safety net)
 * IMPORTANT: Must delete in correct FK order to avoid silent failures!
 */
async function cleanupOrphanedTestData() {
  const sb = getAdminClient();

  // Get test user IDs first
  const { data: testUsers } = await sb
    .from("users")
    .select("id")
    .like("email", `%${TEST_EMAIL_DOMAIN}`);
  const testUserIds = testUsers?.map((u) => u.id) || [];

  // Get test team IDs
  const { data: testTeams } = await sb
    .from("teams")
    .select("id")
    .like("name", `${TEST_PREFIX}%`);
  const testTeamIds = testTeams?.map((t) => t.id) || [];

  // Delete in correct FK order (children before parents)

  // 1. Transactions (references users, teams)
  if (testUserIds.length > 0) {
    await sb.from("transactions").delete().in("user_id", testUserIds);
  }

  // 2. Notifications (references users)
  if (testUserIds.length > 0) {
    await sb.from("notifications").delete().in("user_id", testUserIds);
  }

  // 3. Team achievements (references teams)
  if (testTeamIds.length > 0) {
    await sb.from("team_achievements").delete().in("team_id", testTeamIds);
  }

  // 4. Team members (references teams, users)
  if (testTeamIds.length > 0) {
    await sb.from("team_members").delete().in("team_id", testTeamIds);
  }
  if (testUserIds.length > 0) {
    await sb.from("team_members").delete().in("user_id", testUserIds);
  }

  // 5. Client meetings (references teams, users)
  if (testTeamIds.length > 0) {
    await sb.from("client_meetings").delete().in("team_id", testTeamIds);
  }

  // 6. Weekly reports (references users, teams)
  if (testUserIds.length > 0) {
    await sb.from("weekly_reports").delete().in("user_id", testUserIds);
  }

  // 7. Leaderboard snapshots (references users)
  if (testUserIds.length > 0) {
    await sb.from("leaderboard_snapshots").delete().in("user_id", testUserIds);
  }

  // 8. Teams (now safe - no FK references)
  if (testTeamIds.length > 0) {
    await sb.from("teams").delete().in("id", testTeamIds);
  }

  // 9. Users (last - now safe)
  if (testUserIds.length > 0) {
    await sb.from("users").delete().in("id", testUserIds);
  }
}

/**
 * Get the admin Supabase client
 */
export function getAdminClient(): SupabaseClient {
  if (!supabaseAdmin) {
    throw new Error("Supabase client not initialized. Run tests with vitest.");
  }
  return supabaseAdmin;
}

/**
 * Generate a unique test ID
 */
export function generateTestId(): string {
  return `${TEST_PREFIX}${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}`;
}

/**
 * Create a test user
 */
export async function createTestUser(
  overrides: Partial<{
    name: string;
    email: string;
    primary_role: string;
    status: string;
    total_xp: number;
    total_points: number;
  }> = {}
): Promise<{ id: string; name: string; email: string }> {
  const sb = getAdminClient();
  const testId = generateTestId();

  const userData = {
    id: crypto.randomUUID(),
    name: overrides.name || `Test User ${testId}`,
    email: overrides.email || `${testId}${TEST_EMAIL_DOMAIN}`,
    primary_role: overrides.primary_role || "user",
    status: overrides.status || "active",
    total_xp: overrides.total_xp ?? 0,
    total_points: overrides.total_points ?? 0,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("users")
    .insert(userData)
    .select()
    .single();

  if (error) throw new Error(`Failed to create test user: ${error.message}`);

  testData.users.push(data.id);
  return { id: data.id, name: data.name, email: data.email };
}

/**
 * Create a test team
 */
export async function createTestTeam(
  founderId: string,
  overrides: Partial<{
    name: string;
    description: string;
    status: string;
    team_points: number;
  }> = {}
): Promise<{ id: string; name: string }> {
  const sb = getAdminClient();
  const testId = generateTestId();

  const teamData = {
    id: crypto.randomUUID(),
    name: overrides.name || `${TEST_PREFIX}Team_${testId}`,
    description: overrides.description || "Test team for automated testing",
    status: overrides.status || "active",
    founder_id: founderId,
    team_points: overrides.team_points ?? 0,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("teams")
    .insert(teamData)
    .select()
    .single();

  if (error) throw new Error(`Failed to create test team: ${error.message}`);

  testData.teams.push(data.id);

  // Add founder as team member
  await addTestTeamMember(data.id, founderId, "founder");

  return { id: data.id, name: data.name };
}

/**
 * Add a member to a test team
 */
export async function addTestTeamMember(
  teamId: string,
  userId: string,
  role: "founder" | "co_founder" | "leader" | "member" = "member"
): Promise<void> {
  const sb = getAdminClient();

  const { error } = await sb.from("team_members").insert({
    team_id: teamId,
    user_id: userId,
    team_role: role,
    joined_at: new Date().toISOString(),
  });

  if (error) throw new Error(`Failed to add team member: ${error.message}`);

  testData.teamMembers.push({ team_id: teamId, user_id: userId });
}

/**
 * Create task progress for a team
 * Note: assigned_to_user_id must be NULL or a real auth.users ID (not test users)
 */
export async function createTestTaskProgress(
  taskId: string,
  teamId: string,
  overrides: Partial<{
    status: string;
    assigned_to_user_id: string | null;
    reviewer_user_id: string | null;
  }> = {}
): Promise<{ id: string }> {
  const sb = getAdminClient();

  // Note: For team context, user_id must be NULL per check constraint
  // assigned_to_user_id must be NULL or a real auth user (FK constraint)
  const progressData = {
    id: crypto.randomUUID(),
    task_id: taskId,
    team_id: teamId,
    user_id: null, // Must be NULL for team context
    context: "team",
    activity_type: "team",
    status: overrides.status || "not_started",
    assigned_to_user_id: overrides.assigned_to_user_id ?? null, // NULL for tests
    reviewer_user_id: overrides.reviewer_user_id ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("task_progress")
    .insert(progressData)
    .select()
    .single();

  if (error)
    throw new Error(`Failed to create task progress: ${error.message}`);

  testData.taskProgress.push(data.id);
  return { id: data.id };
}

/**
 * Create a client meeting for a team
 */
export async function createTestClientMeeting(
  teamId: string,
  responsibleUserId: string,
  overrides: Partial<{
    client_name: string;
    status: string;
    meeting_date: string;
    completed_at: string;
  }> = {}
): Promise<{ id: string }> {
  const sb = getAdminClient();
  const testId = generateTestId();

  const meetingData = {
    id: crypto.randomUUID(),
    team_id: teamId,
    responsible_user_id: responsibleUserId,
    client_name: overrides.client_name || `${TEST_PREFIX}Client_${testId}`,
    status: overrides.status || "scheduled",
    meeting_date: overrides.meeting_date || new Date().toISOString(),
    completed_at: overrides.completed_at || null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("client_meetings")
    .insert(meetingData)
    .select()
    .single();

  if (error)
    throw new Error(`Failed to create client meeting: ${error.message}`);

  testData.clientMeetings.push(data.id);
  return { id: data.id };
}

/**
 * Get user's current XP and points
 */
export async function getUserStats(
  userId: string
): Promise<{ total_xp: number; total_points: number }> {
  const sb = getAdminClient();

  const { data, error } = await sb
    .from("users")
    .select("total_xp, total_points")
    .eq("id", userId)
    .single();

  if (error) throw new Error(`Failed to get user stats: ${error.message}`);

  return {
    total_xp: data.total_xp || 0,
    total_points: data.total_points || 0,
  };
}

/**
 * Get a real task ID from the database (for testing)
 */
export async function getAnyTaskId(): Promise<string> {
  const sb = getAdminClient();

  const { data, error } = await sb
    .from("tasks")
    .select("id")
    .eq("is_active", true)
    .eq("activity_type", "team")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("No active team tasks found in database for testing");
  }

  return data.id;
}

/**
 * Get task IDs for a specific achievement
 */
export async function getTasksForAchievement(
  achievementId: string
): Promise<string[]> {
  const sb = getAdminClient();

  const { data, error } = await sb
    .from("tasks")
    .select("id")
    .eq("achievement_id", achievementId)
    .eq("is_active", true);

  if (error) throw new Error(`Failed to get tasks: ${error.message}`);

  return data?.map((t) => t.id) || [];
}

/**
 * Get any achievement ID from the database
 */
export async function getAnyAchievementId(): Promise<{
  id: string;
  name: string;
  xp_reward: number;
  points_reward: number;
}> {
  const sb = getAdminClient();

  const { data, error } = await sb
    .from("achievements")
    .select("id, name, xp_reward, points_reward")
    .eq("active", true)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("No achievements found in database for testing");
  }

  return data;
}

/**
 * Track a transaction ID for cleanup
 */
export function trackTransaction(id: string): void {
  testData.transactions.push(id);
}

/**
 * Track a team achievement ID for cleanup
 */
export function trackTeamAchievement(id: string): void {
  testData.teamAchievements.push(id);
}
