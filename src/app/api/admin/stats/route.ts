import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminStats,
  ProgramHealth,
  TaskPipelineRow,
  TeamRanking,
  WeeklyTrend,
} from "@/types/admin-stats";
import type { AiReviewAdminSummary } from "@/types/ai-review-admin";

/**
 * Admin overview data. One round trip, five RPCs, nothing the overview does
 * not render. All numbers are computed in SQL so no query can hit the
 * 1000-row client cap.
 */
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
    // The new RPCs are not in the generated types yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpc = adminClient.rpc as any;

    const [programHealth, taskPipeline, aiReview, teamXp, weeklyTrends] =
      await Promise.all([
        rpc("get_admin_program_health_v3").then(
          (res: { data: ProgramHealth[] | null }) => res.data?.[0] ?? null
        ),
        rpc("get_admin_task_pipeline_v1").then(
          (res: { data: TaskPipelineRow[] | null }) =>
            (res.data ?? []).map((r) => ({ ...r, count: Number(r.count) }))
        ),
        rpc("get_ai_review_admin_summary_v1").then(
          (res: { data: Partial<AiReviewAdminSummary> | null }) =>
            res.data
              ? {
                  today: Number(res.data.today ?? 0),
                  approval_rate: Number(res.data.approval_rate ?? 0),
                  reject_reasons: res.data.reject_reasons ?? {},
                  failures: Number(res.data.failures ?? 0),
                  cost_usd: Number(res.data.cost_usd ?? 0),
                }
              : null
        ),
        adminClient
          .rpc("get_top_teams_with_xp", { team_limit: 10 })
          .then((res) => (res.data ?? []) as TeamRanking[]),
        rpc("get_admin_weekly_trends").then(
          (res: { data: WeeklyTrend[] | null }) => res.data ?? []
        ),
      ]);

    const body: AdminStats = {
      programHealth,
      taskPipeline,
      aiReview,
      teamXp,
      weeklyTrends,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
