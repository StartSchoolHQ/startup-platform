import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "50"))
    );
    const userId = url.searchParams.get("user_id");
    const teamId = url.searchParams.get("team_id");
    const weekParam = url.searchParams.get("week"); // format: "YYYY-WW"
    const status = url.searchParams.get("status"); // submitted | draft | all

    // Admin role verified above — use admin client to bypass RLS
    // so admins can read reports across all teams.
    const adminClient = createAdminClient();

    let query = adminClient.from("weekly_reports").select(
      `id, user_id, team_id, week_start_date, week_end_date, week_number, week_year, submitted_at, created_at, status, context, submission_data,
         user:user_id(id, name, email),
         team:team_id(id, name)`,
      { count: "exact" }
    );

    if (userId) query = query.eq("user_id", userId);
    if (teamId) query = query.eq("team_id", teamId);
    if (status && status !== "all") query = query.eq("status", status);
    if (weekParam) {
      const [yearStr, weekStr] = weekParam.split("-");
      const year = parseInt(yearStr);
      const week = parseInt(weekStr);
      if (!isNaN(year) && !isNaN(week)) {
        query = query.eq("week_year", year).eq("week_number", week);
      }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order("week_year", { ascending: false })
      .order("week_number", { ascending: false })
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching weekly reports:", error);
      return NextResponse.json(
        { error: "Failed to fetch weekly reports" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reports: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error in weekly reports route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
