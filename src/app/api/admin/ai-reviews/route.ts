import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AiReviewAdminResponse,
  AiReviewAdminRow,
  AiReviewAdminSummary,
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

/** page/limit query-param parsing with a NaN-safe fallback + clamp. */
function parseIntParam(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Strips characters that would break PostgREST filter syntax
 * (`.or()` / `.ilike()` use `,`, `(`, `)` as structural separators and `%`
 * as the ilike wildcard) and caps length. Never throws — a search string
 * that can't be used safely just degrades to "no search".
 */
function sanitizeSearch(raw: string): string {
  return raw
    .trim()
    .slice(0, 100)
    .replace(/[,()%]/g, "");
}

/**
 * Summary numbers come from get_ai_review_admin_summary_v1 (SQL aggregates)
 * instead of selecting every finished row into Node on every request. Typed
 * against the loose SupabaseClient generic because src/types/database.ts is
 * auto-generated and has not been regenerated for this function yet.
 */
async function fetchSummary(
  admin: SupabaseClient
): Promise<AiReviewAdminSummary> {
  const { data, error } = await admin.rpc("get_ai_review_admin_summary_v1");
  if (error) {
    throw new Error(`ai review summary failed: ${error.message}`);
  }
  const raw = (data ?? {}) as Partial<AiReviewAdminSummary>;
  return {
    today: Number(raw.today ?? 0),
    approval_rate: Number(raw.approval_rate ?? 0),
    reject_reasons: raw.reject_reasons ?? {},
    failures: Number(raw.failures ?? 0),
    cost_usd: Number(raw.cost_usd ?? 0),
  };
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
    const page = parseIntParam(
      url.searchParams.get("page"),
      1,
      1,
      Number.MAX_SAFE_INTEGER
    );
    const limit = parseIntParam(url.searchParams.get("limit"), 25, 1, 100);
    const status = url.searchParams.get("status") || "all";
    const rejectReason = url.searchParams.get("reject_reason") || "all";
    const search = sanitizeSearch(url.searchParams.get("search") || "");

    const admin = createAdminClient();

    // Resolve the search term to task/student ids BEFORE the main query so
    // pagination + count reflect the search, not just the current page.
    let taskIds: string[] = [];
    let userIds: string[] = [];
    if (search) {
      const [taskMatches, userMatches] = await Promise.all([
        admin.from("tasks").select("id").ilike("title", `%${search}%`),
        admin.from("users").select("id").ilike("name", `%${search}%`),
      ]);
      taskIds = (taskMatches.data ?? []).map((t) => t.id as string);
      userIds = (userMatches.data ?? []).map((u) => u.id as string);

      if (taskIds.length === 0 && userIds.length === 0) {
        // Nothing matches the search — short-circuit before the main query.
        const summary = await fetchSummary(admin);
        const body: AiReviewAdminResponse = {
          data: [],
          total: 0,
          page,
          limit,
          summary,
        };
        return NextResponse.json(body);
      }
    }

    let q = admin.from("ai_task_reviews").select(
      `id, progress_id, attempt, status, reject_reason, decision, confidence, feedback, criteria_results,
       evidence_manifest, submission_snapshot, model, cost_usd, input_tokens, output_tokens, error,
       created_at, finished_at,
       task:tasks!ai_task_reviews_task_id_fkey(id, title),
       student:users!ai_task_reviews_user_id_fkey(id, name, avatar_url)`,
      { count: "exact" }
    );

    if (status !== "all") {
      q = q.eq("status", status);
    }
    if (rejectReason !== "all") {
      q = q.eq("reject_reason", rejectReason);
    }
    if (search) {
      // At least one of taskIds/userIds is non-empty here (empty-both was
      // handled above) — uuids need no quoting inside `in.(...)`.
      const orParts: string[] = [];
      if (taskIds.length) orParts.push(`task_id.in.(${taskIds.join(",")})`);
      if (userIds.length) orParts.push(`user_id.in.(${userIds.join(",")})`);
      q = q.or(orParts.join(","));
    }

    q = q
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data, count, error } = await q;

    if (error) {
      console.error("AI reviews query error:", error);
      return NextResponse.json(
        { error: "Failed to load reviews" },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as unknown as RawReviewRow[];

    const progressIds = [...new Set(rows.map((r) => r.progress_id))];
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

    const summary = await fetchSummary(admin);

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
