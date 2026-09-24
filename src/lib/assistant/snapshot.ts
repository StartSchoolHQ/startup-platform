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
  page: PageContext
): Promise<PageSummary> {
  if (!page.taskId) return { route: page.route, task: null };
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "title, description, detailed_instructions, is_recurring, cooldown_days, achievements(name)"
    )
    .eq("id", page.taskId)
    .maybeSingle();
  if (error || !data) return { route: page.route, task: null };
  const phase = data.achievements as { name: string } | null;
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
  };
}
