import { NextRequest, NextResponse } from "next/server";
import {
  generateServerSideWeeklySnapshots,
  generateServerSideWeeklyTeamSnapshots,
} from "@/lib/leaderboard-server";

export async function POST(request: NextRequest) {
  try {
    // Check for authorization (simple API key approach)
    const authHeader = request.headers.get("authorization");
    const expectedKey = process.env.CRON_SECRET_KEY;

    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { weekNumber, weekYear } = body;

    console.log("Starting automated snapshot generation...");

    const [userResult, teamResult] = await Promise.all([
      generateServerSideWeeklySnapshots(weekNumber, weekYear),
      generateServerSideWeeklyTeamSnapshots(weekNumber, weekYear),
    ]);

    console.log("User snapshot generation completed:", userResult);
    console.log("Team snapshot generation completed:", teamResult);

    return NextResponse.json({
      success: true,
      message: userResult.message,
      usersProcessed: userResult.usersProcessed,
      teamsProcessed: teamResult.teamsProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in automated snapshot generation:", error);
    return NextResponse.json(
      {
        error: "Failed to generate snapshots",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support GET for health checks
export async function GET() {
  return NextResponse.json({
    status: "ready",
    endpoint: "Automated snapshot generation",
    timestamp: new Date().toISOString(),
  });
}
