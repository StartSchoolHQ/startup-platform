import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  taskProgressId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
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
      .select("primary_role, name")
      .eq("id", user.id)
      .single();

    if (profile?.primary_role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { taskProgressId } = parsed.data;
    const adminClient = createAdminClient();

    // Fetch current task progress
    const { data: task, error: fetchError } = await adminClient
      .from("task_progress")
      .select("id, status, reviewer_user_id, peer_review_history")
      .eq("id", taskProgressId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { error: "Task progress not found" },
        { status: 404 }
      );
    }

    if (task.status !== "pending_review") {
      return NextResponse.json(
        { error: "Can only remove reviewer from pending_review tasks" },
        { status: 400 }
      );
    }

    if (!task.reviewer_user_id) {
      return NextResponse.json(
        { error: "No reviewer assigned to this task" },
        { status: 400 }
      );
    }

    // Add removal event to peer_review_history
    const history =
      (task.peer_review_history as Array<Record<string, unknown>>) || [];
    const updatedHistory = [
      ...history,
      {
        event_type: "reviewer_removed",
        reviewer_id: task.reviewer_user_id,
        removed_by: user.id,
        removed_by_name: profile?.name || "Admin",
        timestamp: new Date().toISOString(),
        reason: "Admin removed reviewer",
      },
    ];

    // Clear reviewer, keep status as pending_review (now goes back to available pool)
    const { error: updateError } = await adminClient
      .from("task_progress")
      .update({
        reviewer_user_id: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        peer_review_history: updatedHistory as any,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskProgressId);

    if (updateError) {
      console.error("Failed to remove reviewer:", updateError);
      return NextResponse.json(
        { error: "Failed to remove reviewer" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing reviewer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
