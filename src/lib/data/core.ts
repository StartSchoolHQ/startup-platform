import { createClient } from "@/lib/supabase/client";

// ============================================================================
// RETRY LOGIC UTILITY
// ============================================================================

/**
 * Retry wrapper for database operations with exponential backoff
 * Handles temporary connection issues gracefully
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Don't retry on certain error types
      if (error && typeof error === "object" && "code" in error) {
        const dbError = error as { code?: string };
        // Don't retry on authentication, permission, or constraint violations
        if (
          dbError.code === "PGRST301" || // Authentication required
          dbError.code === "PGRST116" || // Permission denied
          dbError.code === "23514" || // Check constraint violation
          dbError.code === "23505"
        ) {
          // Unique constraint violation
          throw error;
        }
      }

      if (attempt === maxRetries) throw error;

      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("All retry attempts failed");
}

// ============================================================================
// SHARED TYPE DEFINITIONS
// ============================================================================

// Type for team data from relationship queries
export interface TeamRelation {
  name: string;
  id?: string;
  description?: string | null;
}

// Type for user data from relationship queries
export interface UserRelation {
  email: string;
  name: string | null;
  id?: string;
  avatar_url?: string | null;
}

// Database type interfaces
export interface DatabaseTeam {
  id: string;
  name: string;
  description: string | null;
  website?: string | null;
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
      total_points: number;
    };
  }[];
  revenue_streams?: {
    mrr_amount: number;
    verified: boolean;
  }[];
}

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

/**
 * Debug function to check auth status
 */
export async function debugAuthStatus() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}
