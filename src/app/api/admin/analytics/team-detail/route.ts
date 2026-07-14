import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../_guard";

const paramsSchema = z.object({ teamId: z.string().uuid() });

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const parsed = paramsSchema.safeParse({
      teamId: request.nextUrl.searchParams.get("teamId"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "teamId must be a valid UUID" },
        { status: 400 }
      );
    }

    const { data, error } = await guard.supabase.rpc(
      "get_analytics_team_detail",
      { p_team_id: parsed.data.teamId }
    );
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("[analytics/team-detail]", err);
    return NextResponse.json(
      { error: "Failed to load team detail" },
      { status: 500 }
    );
  }
}
