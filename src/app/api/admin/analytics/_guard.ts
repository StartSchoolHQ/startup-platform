import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { parseBatchParam } from "@/lib/admin/batch-scope";

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

/**
 * Calls a batch-scoped `_v2` analytics RPC. The v2 functions are not in the
 * generated Database types yet, hence the single untyped call site.
 */
export function rpcScoped<T>(
  supabase: SupabaseClient<Database>,
  fn: string,
  request: { nextUrl: { searchParams: URLSearchParams } },
  extra: Record<string, unknown> = {}
): Promise<{ data: T | null; error: { message: string } | null }> {
  const p_batch_id = parseBatchParam(request.nextUrl.searchParams);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).rpc(fn, { p_batch_id, ...extra });
}
