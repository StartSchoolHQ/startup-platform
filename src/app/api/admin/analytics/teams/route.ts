import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rpcScoped } from "../_guard";

/** `?batch=<uuid>` scopes to a diploma batch; absent = current cohort. */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const { data, error } = await rpcScoped(
      guard.supabase,
      "get_analytics_teams_v2",
      request
    );
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("[analytics/teams]", err);
    return NextResponse.json(
      { error: "Failed to load team analytics" },
      { status: 500 }
    );
  }
}
