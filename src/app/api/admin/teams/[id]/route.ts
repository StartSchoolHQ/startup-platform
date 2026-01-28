import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UUIDSchema, AdminTeamUpdateSchema } from "@/lib/validation-schemas";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const params = await context.params;
    const teamId = params.id;

    // Validate UUID format with Zod
    const uuidValidation = UUIDSchema.safeParse(teamId);
    if (!uuidValidation.success) {
      return NextResponse.json(
        { error: "Invalid team ID format" },
        { status: 400 }
      );
    }

    // Get team basic info
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select(
        "id, name, description, website, status, created_at, team_points, formation_cost, weekly_maintenance_cost, strikes_count, founder:founder_id(id, name, email)"
      )
      .eq("id", teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Get team members with roles
    const { data: members } = await supabase
      .from("team_members")
      .select(
        `
        id,
        team_role,
        joined_at,
        left_at,
        user:user_id(id, name, email, total_xp, total_points)
      `
      )
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true });

    // Get task progress
    const { data: tasks } = await supabase
      .from("task_progress")
      .select(
        `
        id,
        status,
        started_at,
        completed_at,
        points_awarded,
        task:task_id(id, title, category, base_xp_reward, base_points_reward)
      `
      )
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Task stats
    const taskStats = {
      total: tasks?.length || 0,
      completed: tasks?.filter((t) => t.status === "completed").length || 0,
      in_progress: tasks?.filter((t) => t.status === "in_progress").length || 0,
      pending_review:
        tasks?.filter((t) => t.status === "pending_review").length || 0,
    };

    // Get client meetings
    const { data: meetings } = await supabase
      .from("client_meetings")
      .select(
        `
        id,
        client_name,
        status,
        meeting_date,
        completed_at,
        client_type,
        call_type,
        responsible_user:responsible_user_id(id, name)
      `
      )
      .eq("team_id", teamId)
      .order("meeting_date", { ascending: false })
      .limit(20);

    const meetingsStats = {
      total: meetings?.length || 0,
      completed: meetings?.filter((m) => m.status === "completed").length || 0,
      scheduled: meetings?.filter((m) => m.status === "scheduled").length || 0,
    };

    // Get revenue streams (aggregate only for security)
    const { data: revenue } = await supabase
      .from("revenue_streams")
      .select("mrr_amount, type, verified, started_at, ended_at")
      .eq("team_id", teamId);

    const revenueStats = {
      total_streams: revenue?.length || 0,
      verified_streams: revenue?.filter((r) => r.verified).length || 0,
      total_mrr:
        revenue?.reduce((sum, r) => sum + (Number(r.mrr_amount) || 0), 0) || 0,
    };

    // Get strikes
    const { data: strikes } = await supabase
      .from("team_strikes")
      .select(
        `
        id,
        strike_type,
        title,
        description,
        status,
        xp_penalty,
        points_penalty,
        created_at,
        explanation,
        explained_at,
        user:user_id(id, name)
      `
      )
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(20);

    const strikesStats = {
      total: strikes?.length || 0,
      active: strikes?.filter((s) => s.status === "active").length || 0,
      resolved: strikes?.filter((s) => s.status === "resolved").length || 0,
    };

    // Get transaction history (team-related only)
    const { data: transactions } = await supabase
      .from("transactions")
      .select(
        `
        id,
        type,
        xp_change,
        points_change,
        points_type,
        description,
        created_at,
        user:user_id(id, name)
      `
      )
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get weekly reports
    const { data: reports } = await supabase
      .from("weekly_reports")
      .select("id, week_number, week_year, submitted_at, context")
      .eq("team_id", teamId)
      .order("week_year", { ascending: false })
      .order("week_number", { ascending: false })
      .limit(10);

    return NextResponse.json({
      team: {
        ...team,
        member_count: members?.filter((m) => !m.left_at).length || 0,
      },
      members: members || [],
      tasks: {
        stats: taskStats,
        recent: tasks || [],
      },
      meetings: {
        stats: meetingsStats,
        recent: meetings || [],
      },
      revenue: revenueStats,
      strikes: {
        stats: strikesStats,
        recent: strikes || [],
      },
      transactions: transactions || [],
      reports: reports || [],
    });
  } catch (error) {
    console.error("Error fetching team details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
