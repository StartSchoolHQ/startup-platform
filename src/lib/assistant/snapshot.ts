import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { MyJourneyOverview } from "@/types/dashboard";
import type { PageContext } from "./types";

/** Compact view of the student's own state. Credits are deliberately omitted. */
export interface StudentSnapshot {
  name: string;
  role: "user" | "admin";
  xp: number;
  phases: {
    name: string;
    completed: number;
    total: number;
    status: string;
  }[];
  inProgress: { title: string; status: string; startedAt: string | null }[];
  nextUp: string | null;
  recurring: { title: string; state: string; nextAvailable: string | null }[];
}

export interface PageSummary {
  route: string;
  task: {
    title: string;
    description: string | null;
    instructions: string | null;
    phase: string | null;
    isRecurring: boolean;
    cooldownDays: number | null;
  } | null;
  /**
   * The student's latest settled AI review of this task, exactly what the
   * result card already shows them: verdict, attempt, prose feedback and
   * the failed checks. Never the rubric, the passed checks' evidence or
   * the reviewer's confidence. Null off task pages and while a review runs.
   */
  review: {
    outcome: "approved" | "rejected";
    attempt: number;
    feedback: string | null;
    failedChecks: { label: string; evidence: string }[];
  } | null;
}

/**
 * Both RPCs are `auth.uid()`-guarded, so `supabase` MUST be the student's
 * cookie client, never the admin client.
 */
export async function loadStudentSnapshot(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<StudentSnapshot> {
  const [profile, overview, recurring] = await Promise.all([
    supabase
      .from("users")
      .select("name, primary_role")
      .eq("id", userId)
      .single(),
    supabase.rpc("get_my_journey_overview_v1", { p_user_id: userId }),
    supabase.rpc("get_my_journey_recurring_status_v1"),
  ]);
  if (profile.error) throw new Error(`profile: ${profile.error.message}`);
  if (overview.error) throw new Error(`overview: ${overview.error.message}`);
  if (recurring.error) throw new Error(`recurring: ${recurring.error.message}`);

  const o = overview.data as unknown as MyJourneyOverview;
  return {
    name: profile.data.name ?? "there",
    role: profile.data.primary_role === "admin" ? "admin" : "user",
    xp: o.balances?.my_journey_xp ?? 0,
    phases: (o.achievement_progress ?? []).map((p) => ({
      name: p.name,
      completed: p.completed_tasks,
      total: p.total_tasks,
      status: p.status,
    })),
    inProgress: (o.in_progress ?? []).map((t) => ({
      title: t.title,
      status: t.status,
      startedAt: t.started_at,
    })),
    nextUp: o.next_up?.title ?? null,
    recurring: (recurring.data ?? []).map((r) => ({
      title: r.title,
      state: r.recurring_status,
      nextAvailable: r.next_available ?? null,
    })),
  };
}

/**
 * The task the student is looking at, if any. Selects only what a student
 * can already read on the task page — never `peer_review_criteria` or
 * `review_instructions`, which would let Startie coach to the rubric.
 */
export async function loadPageSummary(
  supabase: SupabaseClient<Database>,
  page: PageContext,
  userId?: string
): Promise<PageSummary> {
  if (!page.taskId) return { route: page.route, task: null, review: null };
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "title, description, detailed_instructions, is_recurring, cooldown_days, achievements(name)"
    )
    .eq("id", page.taskId)
    .maybeSingle();
  if (error || !data) return { route: page.route, task: null, review: null };
  const phase = data.achievements as { name: string } | null;
  const review = userId
    ? await loadLatestReview(supabase, page.taskId, userId)
    : null;
  return {
    route: page.route,
    task: {
      title: data.title,
      description: data.description,
      instructions: data.detailed_instructions,
      phase: phase?.name ?? null,
      isRecurring: Boolean(data.is_recurring),
      cooldownDays: data.cooldown_days,
    },
    review,
  };
}

interface ReviewStatusRow {
  attempt: number;
  status: string;
  feedback: string | null;
  criteria_results:
    | { label?: string; passed?: boolean; evidence?: string }[]
    | null;
}

/**
 * Same path the result card uses: the student's own progress row, then the
 * owner-only `get_ai_review_status_v1` RPC. Any failure degrades to null;
 * a missing review must never break the chat.
 */
async function loadLatestReview(
  supabase: SupabaseClient<Database>,
  taskId: string,
  userId: string
): Promise<PageSummary["review"]> {
  try {
    const progress = await supabase
      .from("task_progress")
      .select("id")
      .eq("task_id", taskId)
      .eq("user_id", userId)
      .eq("context", "individual")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const progressId = progress.data?.id;
    if (progress.error || !progressId) return null;

    const { data, error } = await supabase.rpc("get_ai_review_status_v1", {
      p_progress_id: progressId,
    });
    if (error || !data) return null;
    const row = data as unknown as ReviewStatusRow;
    if (row.status !== "approved" && row.status !== "rejected") return null;
    return {
      outcome: row.status,
      attempt: row.attempt,
      feedback: row.feedback,
      failedChecks: (row.criteria_results ?? [])
        .filter((c) => c.passed === false)
        .map((c) => ({ label: c.label ?? "", evidence: c.evidence ?? "" })),
    };
  } catch {
    return null;
  }
}
