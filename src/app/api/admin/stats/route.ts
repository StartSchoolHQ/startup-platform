import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
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

    const adminClient = createAdminClient();

    const [
      usersResult,
      teamsResult,
      tasksResult,
      taskProgressResult,
      meetingsResult,
      strikesResult,
      reportsResult,
      teamXpResult,
      weeklyTrendsResult,
      programHealthResult,
    ] = await Promise.all([
      // User counts
      supabase
        .from("users")
        .select("id, created_at", { count: "exact", head: false })
        .then((res) => {
          return adminClient.auth.admin
            .listUsers({ perPage: 1000 })
            .then((authRes) => ({
              total: res.data?.length || 0,
              confirmed:
                authRes.data?.users.filter((u) => u.email_confirmed_at)
                  .length || 0,
            }));
        }),

      // Teams
      supabase
        .from("teams")
        .select("status")
        .then((res) => ({
          total: res.data?.length || 0,
          active: res.data?.filter((t) => t.status === "active").length || 0,
        })),

      // Total task templates
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .then((res) => res.count || 0),

      // Task progress statuses
      adminClient
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

      // Meetings
      adminClient
        .from("client_meetings")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .then((res) => res.count || 0),

      // Active strikes
      adminClient
        .from("team_strikes")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .then((res) => res.count || 0),

      // Total reports
      adminClient
        .from("weekly_reports")
        .select("*", { count: "exact", head: true })
        .then((res) => res.count || 0),

      // Team XP rankings
      supabase
        .rpc("get_top_teams_with_xp", { team_limit: 10 })
        .then((res) => res.data || []),

      // Weekly trends (last 14 weeks)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (adminClient.rpc as any)("get_admin_weekly_trends").then(
        (res: { data: unknown }) => res.data || []
      ),

      // Program health metrics (v2: includes student/team bucket counts + WoW deltas)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (adminClient.rpc as any)("get_admin_program_health_v2").then(
        (res: { data: unknown[] }) => res.data?.[0] || null
      ),
    ]);

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
          teamXpResult?.map(
            (t: { id: string; name: string; team_points: number }) => ({
              id: t.id,
              name: t.name,
              team_points: t.team_points,
            })
          ) || [],
        teamXp: teamXpResult || [],
        weeklyTrends: weeklyTrendsResult,
        programHealth: programHealthResult,
      },
      {
        headers: {
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
