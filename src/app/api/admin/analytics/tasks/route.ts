import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, rpcScoped } from "../_guard";

/** `?batch=<uuid>` scopes to a diploma batch; absent = current cohort. */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const { data, error } = await rpcScoped(
      guard.supabase,
      "get_analytics_tasks_v2",
      request
    );
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("[analytics/tasks]", err);
    return NextResponse.json(
      { error: "Failed to load task analytics" },
      { status: 500 }
    );
  }
}
