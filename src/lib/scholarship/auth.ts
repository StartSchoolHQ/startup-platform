/**
 * Server-only admin guard for scholarship admin API routes.
 *
 * Matches the project's existing pattern (verified in
 * `src/app/api/admin/users/route.ts` and `src/contexts/app-context.tsx`):
 *   1. createClient() returns a cookie-aware server client.
 *   2. auth.getUser() yields the authenticated session.
 *   3. SELECT primary_role from `public.users` for that user.
 *
 * Returns the user's id on success, null on any failure (unauthenticated,
 * not an admin, profile row missing). Callers respond with 404 — leaking
 * a 401 vs 403 would tell scrapers admin routes exist.
 */
import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
}

export async function requireAdmin(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("primary_role")
    .eq("id", user.id)
    .single();
  if (error || data?.primary_role !== "admin") return null;

  return { id: user.id };
}
