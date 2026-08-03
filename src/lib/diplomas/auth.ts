// Admin guard for diploma routes. Intentionally duplicated from the
// scholarship module's requireAdmin — that module is firewalled by
// scripts/seam-audit.mjs, so cross-importing it is not allowed.

import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
}

/** Returns the calling admin's id, or null (route should 404). */
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
