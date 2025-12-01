import { NextRequest, NextResponse } from "next/server";
import { getUserStreaks } from "@/lib/leaderboard-server";

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid userIds array" },
        { status: 400 }
      );
    }

    const streaksMap = await getUserStreaks(userIds);
    
    // Convert Map to Object for JSON serialization
    const streaksObject = Object.fromEntries(streaksMap.entries());
    
    return NextResponse.json({ streaks: streaksObject });
  } catch (error) {
    console.error("Error fetching user streaks:", error);
    return NextResponse.json(
      { error: "Failed to fetch user streaks" },
      { status: 500 }
    );
  }
}