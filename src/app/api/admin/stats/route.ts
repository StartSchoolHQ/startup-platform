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

    // ⚡ OPTIMIZED: Parallelize ALL queries with Promise.all()
    const [
      usersResult,
      teamsResult,
      tasksResult,
      taskProgressResult,
      meetingsResult,
      strikesResult,
      reportsResult,
      teamXpResult,
    ] = await Promise.all([
      // Get user stats from our users table (much faster than auth.admin.listUsers!)
      supabase
        .from("users")
        .select("id, created_at", { count: "exact", head: false })
        .then((res) => {
          const adminClient = createAdminClient();
          // Only fetch confirmed status from auth (lighter query)
          return adminClient.auth.admin
            .listUsers({ perPage: 1000 })
            .then((authRes) => ({
              total: res.data?.length || 0,
              confirmed:
                authRes.data?.users.filter((u) => u.email_confirmed_at)
                  .length || 0,
            }));
        }),

      // Get both total and active teams in ONE query
      supabase
        .from("teams")
        .select("status")
        .then((res) => ({
          total: res.data?.length || 0,
          active: res.data?.filter((t) => t.status === "active").length || 0,
        })),

      // Get total tasks count
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .then((res) => res.count || 0),

      // Get ALL task progress statuses in ONE query (instead of 3 separate queries!)
      // Use admin client to bypass RLS for accurate counts
      createAdminClient()
        .from("task_progress")
        .select("status")
        .then((res) => {
          const statuses = res.data || [];
          return {
            completed: statuses.filter(
              (t) => t.status === "completed" || t.status === "approved"
            ).length,
            in_progress: statuses.filter((t) => t.status === "in_progress")
              .length,
            pending_review: statuses.filter(
              (t) => t.status === "pending_review"
            ).length,
            not_started: statuses.filter((t) => t.status === "not_started")
              .length,
          };
        }),

      // Get completed meetings count (admin client to bypass RLS)
      createAdminClient()
        .from("client_meetings")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .then((res) => res.count || 0),

      // Get active strikes count (admin client to bypass RLS)
      createAdminClient()
        .from("team_strikes")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .then((res) => res.count || 0),

      // Get total reports count (admin client to bypass RLS)
      createAdminClient()
        .from("weekly_reports")
        .select("*", { count: "exact", head: true })
        .then((res) => res.count || 0),

      // Get team XP data
      supabase
        .rpc("get_top_teams_with_xp", { team_limit: 10 })
        .then((res) => res.data || []),
    ]);

    // Short client-side cache to reduce rapid refresh load (admin-only data)
    return NextResponse.json(
      {
        users: {
          total: usersResult.total,
          confirmed: usersResult.confirmed,
          pending: usersResult.total - usersResult.confirmed,
        },
        teams: {
          total: teamsResult.total,
          active: teamsResult.active,
        },
        tasks: {
          total: tasksResult,
          completed: taskProgressResult.completed,
          inProgress: taskProgressResult.in_progress,
        },
        meetings: meetingsResult,
        strikes: strikesResult,
        reports: reportsResult,
        tasksByStatus: taskProgressResult,
        teamPoints:
          teamXpResult?.map((t) => ({
            id: t.id,
            name: t.name,
            team_points: t.team_points,
          })) || [],
        teamXp: teamXpResult || [],
      },
      {
        headers: {
          // Cache for 10 seconds client-side, stale-while-revalidate for 30s
          // private = never cached by CDN (admin data stays private)
          "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
