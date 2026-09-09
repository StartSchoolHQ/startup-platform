import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AiReviewAdminResponse,
  AiReviewAdminRow,
} from "@/types/ai-review-admin";

interface RawReviewRow {
  id: string;
  progress_id: string;
  attempt: number;
  status: string;
  reject_reason: string | null;
  decision: boolean | null;
  confidence: number | null;
  feedback: string | null;
  criteria_results: unknown;
  evidence_manifest: unknown;
  submission_snapshot: unknown;
  model: string | null;
  cost_usd: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
  task: { id: string; title: string } | null;
  student: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

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
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "25"),
      100
    );
    const status = url.searchParams.get("status") || "all";
    const rejectReason = url.searchParams.get("reject_reason") || "all";
    const search = (url.searchParams.get("search") || "").trim();

    const admin = createAdminClient();
    let q = admin
      .from("ai_task_reviews")
      .select(
        `id, progress_id, attempt, status, reject_reason, decision, confidence, feedback, criteria_results,
       evidence_manifest, submission_snapshot, model, cost_usd, input_tokens, output_tokens, error,
       created_at, finished_at,
       task:tasks!ai_task_reviews_task_id_fkey(id, title),
       student:users!ai_task_reviews_user_id_fkey(id, name, avatar_url)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status !== "all") {
      q = q.eq("status", status);
    }
    if (rejectReason !== "all") {
      q = q.eq("reject_reason", rejectReason);
    }

    const { data, count, error } = await q;

    if (error) {
      console.error("AI reviews query error:", error);
      return NextResponse.json(
        { error: "Failed to load reviews" },
        { status: 500 }
      );
    }

    const rawRows = (data ?? []) as unknown as RawReviewRow[];

    const rows = rawRows.filter((r) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        r.task?.title?.toLowerCase().includes(s) ||
        r.student?.name?.toLowerCase().includes(s)
      );
    });

    const progressIds = [...new Set(rawRows.map((r) => r.progress_id))];
    const { data: attemptRows } = progressIds.length
      ? await admin
          .from("ai_task_reviews")
          .select("progress_id")
          .in("progress_id", progressIds)
      : { data: [] as { progress_id: string }[] };

    const attempts = new Map<string, number>();
    for (const a of attemptRows ?? []) {
      attempts.set(a.progress_id, (attempts.get(a.progress_id) ?? 0) + 1);
    }

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const { data: all } = await admin
      .from("ai_task_reviews")
      .select("status, reject_reason, cost_usd, created_at")
      .not("status", "in", "(queued,running)");
    const finals = all ?? [];

    const summary = {
      today: finals.filter((r) => r.created_at >= since.toISOString()).length,
      approval_rate: finals.length
        ? finals.filter((r) => r.status === "approved").length / finals.length
        : 0,
      reject_reasons: finals.reduce<Record<string, number>>((acc, r) => {
        if (r.reject_reason) {
          acc[r.reject_reason] = (acc[r.reject_reason] ?? 0) + 1;
        }
        return acc;
      }, {}),
      failures: finals.filter((r) => r.status === "failed").length,
      cost_usd: Number(
        finals.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0).toFixed(2)
      ),
    };

    const responseRows: AiReviewAdminRow[] = rows.map((r) => ({
      id: r.id,
      attempt: r.attempt,
      status: r.status,
      reject_reason: r.reject_reason,
      decision: r.decision,
      confidence: r.confidence,
      feedback: r.feedback,
      criteria_results: r.criteria_results,
      evidence_manifest: r.evidence_manifest,
      submission_snapshot: r.submission_snapshot,
      model: r.model,
      cost_usd: r.cost_usd,
      input_tokens: r.input_tokens,
      output_tokens: r.output_tokens,
      error: r.error,
      created_at: r.created_at,
      finished_at: r.finished_at,
      task: r.task,
      student: r.student,
      attempts_for_progress: attempts.get(r.progress_id) ?? 1,
    }));

    const body: AiReviewAdminResponse = {
      data: responseRows,
      total: count ?? 0,
      page,
      limit,
      summary,
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
