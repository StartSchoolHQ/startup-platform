import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../_guard";

const paramsSchema = z.object({ userId: z.string().uuid() });

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const parsed = paramsSchema.safeParse({
      userId: request.nextUrl.searchParams.get("userId"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "userId must be a valid UUID" },
        { status: 400 }
      );
    }

    const { data, error } = await guard.supabase.rpc(
      "get_analytics_student_detail",
      { p_user_id: parsed.data.userId }
    );
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("[analytics/student-detail]", err);
    return NextResponse.json(
      { error: "Failed to load student detail" },
      { status: 500 }
    );
  }
}
