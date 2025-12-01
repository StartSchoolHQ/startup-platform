import { NextRequest, NextResponse } from "next/server";
import { generateServerSideWeeklySnapshots } from "@/lib/leaderboard-server";

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

    const result = await generateServerSideWeeklySnapshots(
      weekNumber,
      weekYear
    );

    console.log("Snapshot generation completed:", result);

    return NextResponse.json({
      success: true,
      message: result.message,
      usersProcessed: result.usersProcessed,
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
