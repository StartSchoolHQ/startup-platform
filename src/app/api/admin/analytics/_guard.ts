import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Guard =
  | { ok: true; supabase: SupabaseClient<Database> }
  | { ok: false; response: NextResponse };

/**
 * Shared auth guard for the admin analytics routes. The analytics RPCs also
 * re-check the caller's role in SQL, so a bug here cannot leak data.
 */
export async function requireAdmin(): Promise<Guard> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("primary_role")
    .eq("id", user.id)
    .single();

  if (profile?.primary_role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, supabase };
}
