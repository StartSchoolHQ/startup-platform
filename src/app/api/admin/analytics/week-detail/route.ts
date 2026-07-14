import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../_guard";

const paramsSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD"),
});

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const parsed = paramsSchema.safeParse({
      weekStart: request.nextUrl.searchParams.get("weekStart"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "weekStart must be a YYYY-MM-DD date" },
        { status: 400 }
      );
    }

    const { data, error } = await guard.supabase.rpc(
      "get_analytics_week_detail",
      { p_week_start: parsed.data.weekStart }
    );
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("[analytics/week-detail]", err);
    return NextResponse.json(
      { error: "Failed to load week detail" },
      { status: 500 }
    );
  }
}
