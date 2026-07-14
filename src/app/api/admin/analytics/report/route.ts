import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "../_guard";
import { createAdminClient } from "@/lib/supabase/admin";

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * Returns one full weekly report row (with user + team) in the shape
 * expected by AdminWeeklyReportViewModal, so analytics drill-downs can
 * open the complete report behind any score or quote.
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    const parsed = paramsSchema.safeParse({
      id: request.nextUrl.searchParams.get("id"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "id must be a valid UUID" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("weekly_reports")
      .select(
        `id, user_id, team_id, week_start_date, week_end_date, week_number, week_year, submitted_at, created_at, status, context, submission_data,
         user:user_id(id, name, email),
         team:team_id(id, name)`
      )
      .eq("id", parsed.data.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[analytics/report]", err);
    return NextResponse.json(
      { error: "Failed to load report" },
      { status: 500 }
    );
  }
}
