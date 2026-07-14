import { NextResponse } from "next/server";
import { requireAdmin } from "../_guard";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const { data, error } = await guard.supabase.rpc("get_analytics_strikes");
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("[analytics/strikes]", err);
    return NextResponse.json(
      { error: "Failed to load strike analytics" },
      { status: 500 }
    );
  }
}
