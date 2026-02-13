/**
 * Profile utility functions for handling async trigger operations
 */

import { SupabaseClient } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  email: string;
}

/**
 * Waits for a user profile to exist in public.users table.
 * Handles race condition between auth.users creation and trigger execution.
 *
 * Uses exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms
 * Total max wait: ~1.5 seconds
 *
 * @param supabase - Supabase client
 * @param userId - User ID to check
 * @returns User profile or null if not found after retries
 */
export async function waitForProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const maxRetries = 5;
  const baseDelay = 50; // Start with 50ms

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data: profile, error } = await supabase
      .from("users")
      .select("id, name, avatar_url, email")
      .eq("id", userId)
      .single();

    // Profile found!
    if (profile && !error) {
      return profile;
    }

    // If error is NOT "not found", something else is wrong
    if (error && error.code !== "PGRST116") {
      console.error("Profile check error:", error);
      return null;
    }

    // Profile not found yet, wait before retrying
    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Profile still doesn't exist after retries
  console.warn(
    `Profile not found for user ${userId} after ${maxRetries} attempts`
  );
  return null;
}

/**
 * Checks if a user profile is complete (has name, avatar is optional)
 */
export function isProfileComplete(profile: UserProfile | null): boolean {
  return !!profile?.name;
}
