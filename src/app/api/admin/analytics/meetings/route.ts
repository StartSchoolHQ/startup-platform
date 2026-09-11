import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rpcScoped } from "../_guard";

/** `?batch=<uuid>` scopes to a diploma batch; absent = current cohort. */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const { data, error } = await rpcScoped(
      guard.supabase,
      "get_analytics_meetings_v2",
      request
    );
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("[analytics/meetings]", err);
    return NextResponse.json(
      { error: "Failed to load meeting analytics" },
      { status: 500 }
    );
  }
}
