import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { assigneeId, taskTitle, teamId, teamName } = body;

    if (!assigneeId || !teamId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Skip self-assignment
    if (assigneeId === user.id) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Verify assigner is a member of the same team as the assignee
    const { data: members, error: memberError } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .is("left_at", null)
      .in("user_id", [user.id, assigneeId]);

    if (memberError || !members || members.length < 2) {
      return NextResponse.json(
        { error: "Both users must be members of the same team" },
        { status: 403 }
      );
    }

    // Get assigner's name
    const { data: assignerData } = await supabase
      .from("users")
      .select("name")
      .eq("id", user.id)
      .single();

    const assignerName = assignerData?.name || "A teammate";

    // Insert notification using service role (bypasses RLS)
    const adminClient = createAdminClient();

    const { error: insertError } = await adminClient
      .from("notifications")
      .insert({
        user_id: assigneeId,
        type: "task_assigned",
        title: "New task assigned to you",
        message: `${assignerName} assigned you "${taskTitle || "a task"}" in ${teamName || "your team"}`,
        data: {
          team_id: teamId,
          teamName: teamName,
        },
      });

    if (insertError) {
      console.error("Failed to insert notification:", insertError);
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Task assignment notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
