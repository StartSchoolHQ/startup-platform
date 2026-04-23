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

    // Admin role verified above — use admin client to bypass RLS.
    const adminClient = createAdminClient();

    // Distinct users who have submitted a weekly report
    const { data: reports } = await adminClient
      .from("weekly_reports")
      .select(
        `user_id, team_id, week_number, week_year, week_start_date, week_end_date,
         user:user_id(id, name, email),
         team:team_id(id, name)`
      )
      .order("week_year", { ascending: false })
      .order("week_number", { ascending: false });

    type Row = {
      user_id: string;
      team_id: string | null;
      week_number: number;
      week_year: number;
      week_start_date: string;
      week_end_date: string;
      user: { id: string; name: string | null; email: string } | null;
      team: { id: string; name: string } | null;
    };

    const rows = (reports || []) as unknown as Row[];

    const userMap = new Map<
      string,
      { id: string; name: string | null; email: string }
    >();
    const teamMap = new Map<string, { id: string; name: string }>();
    const weekMap = new Map<
      string,
      {
        key: string;
        week_number: number;
        week_year: number;
        week_start_date: string;
        week_end_date: string;
      }
    >();

    for (const r of rows) {
      if (r.user && !userMap.has(r.user.id)) userMap.set(r.user.id, r.user);
      if (r.team && !teamMap.has(r.team.id)) teamMap.set(r.team.id, r.team);
      const key = `${r.week_year}-${String(r.week_number).padStart(2, "0")}`;
      if (!weekMap.has(key)) {
        weekMap.set(key, {
          key,
          week_number: r.week_number,
          week_year: r.week_year,
          week_start_date: r.week_start_date,
          week_end_date: r.week_end_date,
        });
      }
    }

    const users = Array.from(userMap.values()).sort((a, b) =>
      (a.name || a.email).localeCompare(b.name || b.email)
    );
    const teams = Array.from(teamMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const weeks = Array.from(weekMap.values()).sort((a, b) =>
      b.key.localeCompare(a.key)
    );

    return NextResponse.json({ users, teams, weeks });
  } catch (error) {
    console.error("Error fetching weekly report filters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
