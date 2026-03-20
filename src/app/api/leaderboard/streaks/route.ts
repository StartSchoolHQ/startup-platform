import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid userIds array" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "get_user_weekly_streaks",
      {
        p_user_ids: userIds,
      }
    );

    if (error) throw error;

    // Build streaks object matching the format the frontend expects:
    // { [userId]: { days: number, type: "active" | "warning" | "inactive" } }
    // We keep the `days` key for backwards compat but fill it with weeks data
    const streaksObject: Record<
      string,
      { days: number; type: "active" | "warning" | "inactive" }
    > = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data || []).forEach((row: any) => {
      streaksObject[row.user_id] = {
        days: row.streak_weeks,
        type: row.streak_type,
      };
    });

    // Fill in missing users with defaults
    userIds.forEach((id) => {
      if (!streaksObject[id]) {
        streaksObject[id] = { days: 0, type: "inactive" };
      }
    });

    return NextResponse.json({ streaks: streaksObject });
  } catch (error) {
    console.error("Error fetching user streaks:", error);
    return NextResponse.json(
      { error: "Failed to fetch user streaks" },
      { status: 500 }
    );
  }
}
