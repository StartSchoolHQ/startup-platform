import { NextResponse } from "next/server";
import { requireAdmin } from "../_guard";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const { data, error } = await guard.supabase.rpc("get_analytics_meetings");
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
