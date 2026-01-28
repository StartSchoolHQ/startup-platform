import { createClient } from "@supabase/supabase-js";
import { Database } from "../../types/database";

/**
 * Creates a Supabase admin client with service role key
 * This client bypasses RLS and has full database access
 * ONLY use in secure server-side API routes with proper auth checks
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set in environment variables"
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
