import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: profile } = await supabase
      .from("users")
      .select("primary_role")
      .eq("id", user.id)
      .single();

    if (profile?.primary_role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const strikeId = typeof body?.strikeId === "string" ? body.strikeId : null;
    if (!strikeId) {
      return NextResponse.json(
        { error: "strikeId is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Guard: only resolve strikes that aren't already resolved
    const { data: strike, error: resolveError } = await supabaseAdmin
      .from("team_strikes")
      .update({
        resolved_by_user_id: user.id,
        resolved_at: new Date().toISOString(),
        status: "resolved",
      })
      .eq("id", strikeId)
      .neq("status", "resolved")
      .select("id, user_id, team_id, strike_type, week_number, week_year")
      .single();

    if (resolveError) {
      if (resolveError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Strike not found or already resolved" },
          { status: 404 }
        );
      }
      throw new Error("Failed to resolve strike: " + resolveError.message);
    }

    // Decrement team strikes count
    if (strike.team_id) {
      await supabaseAdmin.rpc("decrement_team_strikes_count", {
        team_id_param: strike.team_id,
      });
    }

    // Check if this triggers a refund (all missed_weekly_report strikes
    // for the same team+week are now resolved)
    let refundTriggered = false;

    if (
      strike.strike_type === "missed_weekly_report" &&
      strike.week_number &&
      strike.week_year
    ) {
      // Check for existing refund FIRST (cheapest query)
      const { data: existingRefund } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("team_id", strike.team_id)
        .eq("type", "weekly_report_refund")
        .eq("week_number", strike.week_number)
        .eq("week_year", strike.week_year)
        .limit(1);

      if (!existingRefund?.length) {
        // Count total and resolved strikes for this team+week
        const { data: strikeCounts } = await supabaseAdmin
          .from("team_strikes")
          .select("id, status")
          .eq("team_id", strike.team_id)
          .eq("strike_type", "missed_weekly_report")
          .eq("week_number", strike.week_number)
          .eq("week_year", strike.week_year);

        const total = strikeCounts?.length || 0;
        const resolved =
          strikeCounts?.filter((s) => s.status === "resolved").length || 0;

        if (total > 0 && total === resolved) {
          // Get all active team members
          const { data: members } = await supabaseAdmin
            .from("team_members")
            .select("user_id")
            .eq("team_id", strike.team_id)
            .is("left_at", null);

          if (members?.length) {
            const REFUND_POINTS = 100;

            // Insert a refund transaction first as a lock marker
            // (if a concurrent request gets here, the duplicate check
            // above will catch it on their next attempt)
            const { error: firstTxError } = await supabaseAdmin
              .from("transactions")
              .insert({
                user_id: members[0].user_id,
                team_id: strike.team_id,
                type: "weekly_report_refund",
                activity_type: "team",
                points_change: REFUND_POINTS,
                xp_change: 0,
                points_type: "team",
                description: `Weekly report penalty refunded — all explanations accepted (Week ${strike.week_number}, ${strike.week_year})`,
                week_number: strike.week_number,
                week_year: strike.week_year,
              });

            if (firstTxError) {
              console.error("Failed to insert first refund tx:", firstTxError);
            } else {
              // Atomic points increment for first member
              await supabaseAdmin.rpc("increment_user_points", {
                p_user_id: members[0].user_id,
                p_amount: REFUND_POINTS,
              });

              // Notification for first member
              await supabaseAdmin.from("notifications").insert({
                user_id: members[0].user_id,
                type: "weekly_report_refund",
                title: "Weekly Report Penalty Refunded",
                message: `Your team's weekly report penalty of ${REFUND_POINTS} points has been refunded — all explanations were accepted.`,
                data: {
                  team_id: strike.team_id,
                  week_number: strike.week_number,
                  week_year: strike.week_year,
                  points_refunded: REFUND_POINTS,
                },
              });

              // Process remaining members
              for (let i = 1; i < members.length; i++) {
                const member = members[i];

                // Atomic points increment
                await supabaseAdmin.rpc("increment_user_points", {
                  p_user_id: member.user_id,
                  p_amount: REFUND_POINTS,
                });

                // Insert refund transaction
                await supabaseAdmin.from("transactions").insert({
                  user_id: member.user_id,
                  team_id: strike.team_id,
                  type: "weekly_report_refund",
                  activity_type: "team",
                  points_change: REFUND_POINTS,
                  xp_change: 0,
                  points_type: "team",
                  description: `Weekly report penalty refunded — all explanations accepted (Week ${strike.week_number}, ${strike.week_year})`,
                  week_number: strike.week_number,
                  week_year: strike.week_year,
                });

                // Send notification
                await supabaseAdmin.from("notifications").insert({
                  user_id: member.user_id,
                  type: "weekly_report_refund",
                  title: "Weekly Report Penalty Refunded",
                  message: `Your team's weekly report penalty of ${REFUND_POINTS} points has been refunded — all explanations were accepted.`,
                  data: {
                    team_id: strike.team_id,
                    week_number: strike.week_number,
                    week_year: strike.week_year,
                    points_refunded: REFUND_POINTS,
                  },
                });
              }

              refundTriggered = true;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      team_id: strike.team_id,
      refundTriggered,
    });
  } catch (error) {
    console.error("Error resolving strike:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to resolve strike",
      },
      { status: 500 }
    );
  }
}
