import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin "Run now" for the program assistant. Kicks an ad-hoc run exactly the
 * way cron does (database function → pg_net → the secret-protected run
 * route), so the browser never sees the secret and the request returns at
 * once; the page polls the run row.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("primary_role")
    .eq("id", user.id)
    .single();
  if (profile?.primary_role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("program_kick_run_v1", {
      p_kind: "adhoc",
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    console.error("[program-assistant] run-now kick failed", e);
    return NextResponse.json(
      {
        error: "Could not start the run; check the vault secret and worker_url",
      },
      { status: 500 }
    );
  }
}
