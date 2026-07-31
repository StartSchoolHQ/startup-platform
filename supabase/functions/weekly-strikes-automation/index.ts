import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Weekly Strikes Automation V2 - Member-Level Detection + Team Penalty
// Creates one strike per team member who missed weekly report submission.
// When PENALTY_POINTS > 0, also deducts that many points from ALL active
// team members of affected teams (once per team per week).
//
// Set to 0 on 2026-07-31 (penalties paused for current batch).
// For the next batch, set back to 100 — must match REFUND_POINTS in
// src/app/api/admin/resolve-strike/route.ts.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PENALTY_POINTS = 0;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(
      `Starting weekly strikes automation (penalty: ${PENALTY_POINTS} points)...`
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } =
      await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Check for members who missed weekly reports (team context)
    console.log("Checking for missed weekly reports (per member)...");
    const { data: missedMembers, error: checkError } = await supabase.rpc(
      "check_missed_weekly_reports_team_context"
    );

    if (checkError) {
      console.error("Error checking missed reports:", checkError);
      throw checkError;
    }

    console.log(
      `Found ${missedMembers?.length || 0} members who missed reports`
    );

    if (!missedMembers || missedMembers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No missed reports found. All members are up to date!",
          processedMembers: 0,
          strikesCreated: 0,
          penaltiesApplied: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Create strikes for members who missed reports
    let createdStrikes = 0;
    const results: any[] = [];

    for (const member of missedMembers) {
      console.log(
        `Processing: ${member.user_name} (${member.team_name}) - Week ${member.week_number}`
      );

      // Duplicate check for strike (use .limit(1) instead of .maybeSingle() to avoid error on multiple matches)
      const { data: existingStrikes } = await supabase
        .from("team_strikes")
        .select("id")
        .eq("team_id", member.team_id)
        .eq("user_id", member.user_id)
        .eq("strike_type", "missed_weekly_report")
        .gte("created_at", member.week_start)
        .lte("created_at", member.week_end)
        .limit(1);

      if (existingStrikes && existingStrikes.length > 0) {
        console.log(
          `Strike already exists for ${member.user_name} in week ${member.week_number}`
        );
        results.push({
          team_id: member.team_id,
          user_id: member.user_id,
          user_name: member.user_name,
          success: false,
          reason: "duplicate",
        });
        continue;
      }

      // Create strike with week_number and week_year
      const { data: strike, error: strikeError } = await supabase
        .from("team_strikes")
        .insert({
          team_id: member.team_id,
          user_id: member.user_id,
          strike_type: "missed_weekly_report",
          title: "Missed Weekly Report Submission",
          description: `${member.user_name} failed to submit team weekly report for week ${member.week_number} (${member.week_year}). Week period: ${member.week_start} to ${member.week_end}.`,
          status: "active",
          xp_penalty: 0,
          points_penalty: PENALTY_POINTS,
          week_number: member.week_number,
          week_year: member.week_year,
        })
        .select()
        .single();

      if (strikeError) {
        console.error(
          `Error creating strike for ${member.user_name}:`,
          strikeError
        );
        results.push({
          team_id: member.team_id,
          user_id: member.user_id,
          user_name: member.user_name,
          success: false,
          error: strikeError.message,
        });
      } else {
        console.log(
          `Strike created for ${member.user_name} in ${member.team_name}: ${strike.id}`
        );
        createdStrikes++;

        // With penalties off, the team-wide penalty notification below never
        // fires — notify the missed member directly about their strike.
        if (PENALTY_POINTS === 0) {
          await supabase.from("notifications").insert({
            user_id: member.user_id,
            type: "weekly_report_penalty",
            title: "Missed Weekly Report — Strike Issued",
            message: `You received a strike for missing the weekly report (Week ${member.week_number}, ${member.week_year}). You can submit an explanation to resolve it.`,
            data: {
              team_id: member.team_id,
              team_name: member.team_name,
              week_number: member.week_number,
              week_year: member.week_year,
              strike_id: strike.id,
            },
          });
        }

        results.push({
          team_id: member.team_id,
          user_id: member.user_id,
          user_name: member.user_name,
          team_name: member.team_name,
          success: true,
          strike_id: strike.id,
        });
      }
    }

    // Update team strikes count
    const uniqueTeamsForStrikes = [
      ...new Set(results.filter((r) => r.success).map((r) => r.team_id)),
    ];
    for (const teamId of uniqueTeamsForStrikes) {
      try {
        await supabase.rpc("update_team_strikes_count", {
          team_id_param: teamId,
        });
      } catch (error) {
        console.log(
          `Could not update strikes count for team ${teamId}:`,
          error
        );
      }
    }

    // Step 3: Apply team-wide penalty (-PENALTY_POINTS to ALL members of
    // affected teams). Skipped entirely while PENALTY_POINTS is 0.
    let penaltiesApplied = 0;
    const penaltyResults: any[] = [];

    if (PENALTY_POINTS > 0) {
      // Group missed members by team, filter out [TEST] teams
      const affectedTeams = new Map<
        string,
        {
          team_name: string;
          missed_names: string[];
          week_number: number;
          week_year: number;
        }
      >();

      for (const member of missedMembers) {
        if (member.team_name && member.team_name.startsWith("[TEST]")) continue;

        if (!affectedTeams.has(member.team_id)) {
          affectedTeams.set(member.team_id, {
            team_name: member.team_name,
            missed_names: [],
            week_number: member.week_number,
            week_year: member.week_year,
          });
        }
        affectedTeams.get(member.team_id)!.missed_names.push(member.user_name);
      }

      for (const [teamId, teamInfo] of affectedTeams) {
        console.log(`Applying penalty to team ${teamInfo.team_name}...`);

        // Get all active members of this team
        const { data: activeMembers, error: membersError } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", teamId)
          .is("left_at", null);

        if (membersError || !activeMembers?.length) {
          console.error(
            `Error getting members for team ${teamId}:`,
            membersError
          );
          continue;
        }

        // Duplicate prevention: check if penalty already applied for this team+week
        const { data: existingPenalties } = await supabase
          .from("transactions")
          .select("id")
          .eq("team_id", teamId)
          .eq("type", "weekly_report_penalty")
          .eq("week_number", teamInfo.week_number)
          .eq("week_year", teamInfo.week_year)
          .limit(1);

        if (existingPenalties && existingPenalties.length > 0) {
          console.log(
            `Penalty already applied for team ${teamInfo.team_name} week ${teamInfo.week_number}`
          );
          continue;
        }

        const missedNamesStr = teamInfo.missed_names.join(", ");
        const penaltyDescription = `Team penalty: ${missedNamesStr} missed weekly report (Week ${teamInfo.week_number}, ${teamInfo.week_year})`;

        // Apply penalty to each active member using atomic RPC
        for (const member of activeMembers) {
          // Atomic point deduction (floors at 0 via GREATEST in the RPC)
          const { error: rpcError } = await supabase.rpc(
            "increment_user_points",
            {
              p_user_id: member.user_id,
              p_amount: -PENALTY_POINTS,
            }
          );

          if (rpcError) {
            console.error(
              `Error deducting points for ${member.user_id}:`,
              rpcError
            );
            continue;
          }

          // Insert transaction record
          const { error: txError } = await supabase
            .from("transactions")
            .insert({
              user_id: member.user_id,
              team_id: teamId,
              type: "weekly_report_penalty",
              activity_type: "team",
              points_change: -PENALTY_POINTS,
              xp_change: 0,
              points_type: "team",
              description: penaltyDescription,
              week_number: teamInfo.week_number,
              week_year: teamInfo.week_year,
              metadata: {
                penalty_type: "missed_weekly_report",
                missed_members: teamInfo.missed_names,
              },
            });

          if (txError) {
            console.error(
              `Error creating penalty transaction for ${member.user_id}:`,
              txError
            );
          } else {
            penaltiesApplied++;
          }

          // Insert notification for this member
          await supabase.from("notifications").insert({
            user_id: member.user_id,
            type: "weekly_report_penalty",
            title: "Team Weekly Report Penalty",
            message: `Your team lost ${PENALTY_POINTS} points per member because ${missedNamesStr} missed the weekly report. They can submit an explanation to recover the points.`,
            data: {
              team_id: teamId,
              team_name: teamInfo.team_name,
              missed_members: teamInfo.missed_names,
              week_number: teamInfo.week_number,
              week_year: teamInfo.week_year,
              points_deducted: PENALTY_POINTS,
            },
          });
        }

        penaltyResults.push({
          team_id: teamId,
          team_name: teamInfo.team_name,
          members_penalized: activeMembers.length,
          missed_members: teamInfo.missed_names,
        });

        console.log(
          `Penalty applied to ${activeMembers.length} members of ${teamInfo.team_name}`
        );
      }
    }

    const response = {
      success: true,
      message: `Automation completed. Created ${createdStrikes} strikes, applied ${penaltiesApplied} penalty transactions across ${penaltyResults.length} teams.`,
      processedMembers: missedMembers.length,
      strikesCreated: createdStrikes,
      penaltiesApplied,
      teamsAffected: uniqueTeamsForStrikes.length,
      teamsPenalized: penaltyResults.length,
      penaltyResults,
      results,
    };

    console.log(
      "Weekly strikes automation completed:",
      JSON.stringify(response)
    );

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fatal error in weekly strikes automation:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
