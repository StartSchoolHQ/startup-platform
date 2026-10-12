import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseBatchParam, resolveScopeIds } from "@/lib/admin/batch-scope";
import {
  lastFullWeekStart,
  motivationScore,
  motivationSummary,
  weekEnd,
} from "@/lib/admin/weekly-report-motivation";

/**
 * Motivation summary for the admin Weekly Reports page: the average
 * `alignmentScore` of last week's submitted SOLO reports within the batch
 * scope, with the change versus the week before. Team reports are left out
 * on purpose (decided 2026-10-12: solo only for now).
 */
export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Admin role verified above — the admin client bypasses RLS.
    const adminClient = createAdminClient();
    const { userIds } = await resolveScopeIds(
      adminClient,
      parseBatchParam(request.nextUrl.searchParams)
    );

    const weekStart = lastFullWeekStart();
    const weekBeforeStart = lastFullWeekStart(
      new Date(`${weekStart}T00:00:00Z`)
    );

    if (userIds.length === 0) {
      return NextResponse.json({
        week_start: weekStart,
        week_end: weekEnd(weekStart),
        ...motivationSummary([], []),
      });
    }

    const { data, error } = await adminClient
      .from("weekly_reports")
      .select("week_start_date, submission_data")
      .in("user_id", userIds)
      .eq("context", "individual")
      .eq("status", "submitted")
      .in("week_start_date", [weekStart, weekBeforeStart]);

    if (error) {
      console.error("Error fetching weekly report summary:", error);
      return NextResponse.json(
        { error: "Failed to fetch weekly report summary" },
        { status: 500 }
      );
    }

    const rows = data || [];
    const scoresFor = (start: string) =>
      rows
        .filter((r) => r.week_start_date === start)
        .map((r) => motivationScore(r.submission_data));

    return NextResponse.json({
      week_start: weekStart,
      week_end: weekEnd(weekStart),
      ...motivationSummary(scoresFor(weekStart), scoresFor(weekBeforeStart)),
    });
  } catch (error) {
    console.error("Error in weekly reports summary route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
