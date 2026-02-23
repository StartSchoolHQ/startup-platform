import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "25"),
      100
    );
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "all";

    // Build query — join tasks, teams, reviewer via FK
    let query = supabase
      .from("task_progress")
      .select(
        `
        id,
        status,
        submission_data,
        review_feedback,
        peer_review_history,
        completed_at,
        updated_at,
        assigned_to_user_id,
        tasks!inner(id, title, category),
        teams(id, name),
        reviewer:users!task_progress_reviewer_user_id_fkey_public(id, name, avatar_url)
      `,
        { count: "exact" }
      )
      .in("status", [
        "pending_review",
        "approved",
        "rejected",
        "revision_required",
      ])
      .order("updated_at", { ascending: false });

    // Status filter
    if (status !== "all") {
      query = query.eq(
        "status",
        status as
          | "pending_review"
          | "approved"
          | "rejected"
          | "revision_required"
      );
    }

    // Pagination
    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data: rows, count, error } = await query;

    if (error) {
      console.error("Peer reviews query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch peer reviews" },
        { status: 500 }
      );
    }

    // Fetch submitter names (assigned_to_user_id has no FK to public.users)
    const submitterIds = [
      ...new Set(
        (rows || [])
          .map((r: Record<string, unknown>) => r.assigned_to_user_id as string)
          .filter(Boolean)
      ),
    ];

    let submitterMap = new Map<
      string,
      { id: string; name: string | null; avatar_url: string | null }
    >();
    if (submitterIds.length > 0) {
      const { data: submitters } = await supabase
        .from("users")
        .select("id, name, avatar_url")
        .in("id", submitterIds);

      submitterMap = new Map((submitters || []).map((s) => [s.id, s]));
    }

    // Shape response
    const reviews = (rows || []).map((row: Record<string, unknown>) => {
      // Extract reviewed_at from peer_review_history
      const history =
        (row.peer_review_history as Array<Record<string, unknown>>) || [];
      const lastReview = [...history]
        .reverse()
        .find((e) => e.event_type === "review_completed");

      const submitter = submitterMap.get(row.assigned_to_user_id as string);

      return {
        id: row.id,
        status: row.status,
        submission_data: row.submission_data,
        review_feedback: row.review_feedback,
        peer_review_history: history,
        completed_at: row.completed_at,
        reviewed_at: (lastReview?.timestamp as string) || null,
        task: row.tasks,
        team: row.teams,
        submitter: submitter || null,
        reviewer: row.reviewer,
      };
    });

    // Apply search filter in-memory (across task title, team name, submitter/reviewer names)
    let filtered = reviews;
    if (search) {
      const s = search.toLowerCase();
      filtered = reviews.filter(
        (r: Record<string, unknown>) =>
          ((r.task as Record<string, unknown>)?.title as string)
            ?.toLowerCase()
            .includes(s) ||
          ((r.team as Record<string, unknown>)?.name as string)
            ?.toLowerCase()
            .includes(s) ||
          ((r.submitter as Record<string, unknown>)?.name as string)
            ?.toLowerCase()
            .includes(s) ||
          ((r.reviewer as Record<string, unknown>)?.name as string)
            ?.toLowerCase()
            .includes(s)
      );
    }

    return NextResponse.json({
      data: filtered,
      total: search ? filtered.length : (count ?? 0),
      page,
      limit,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
