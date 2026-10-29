import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DraftBeaconSchema, type DraftBeacon } from "@/lib/validation-schemas";
import type { Json } from "@/types/database";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Saves the draft as the signed-in user. Returns an error message or null. */
async function saveDraft(
  supabase: ServerClient,
  userId: string,
  body: DraftBeacon
): Promise<string | null> {
  if (body.kind === "task") {
    const { error } = await supabase.rpc("save_task_submission_draft_v1", {
      p_progress_id: body.progressId,
      p_draft: body.draft as Json,
    });
    return error ? error.message : null;
  }

  if (body.kind === "solo_report") {
    const { error } = await supabase.rpc("submit_individual_weekly_report_v1", {
      p_submission_data: body.data as Json,
      p_as_draft: true,
    });
    return error ? error.message : null;
  }

  // Team reports keep the shared 10:00 cutoff (v1, not the solo v2).
  const { data: weeks, error: weekError } = await supabase.rpc(
    "get_riga_week_boundaries"
  );
  const week = weeks?.[0];
  if (weekError || !week) return "Failed to get current week boundaries";

  const { data, error } = await supabase.rpc("save_weekly_report_draft", {
    p_user_id: userId,
    p_team_id: body.teamId,
    p_week_start_date: week.week_start,
    p_week_end_date: week.week_end,
    p_week_number: week.week_number,
    p_week_year: week.week_year,
    p_submission_data: body.data as Json,
  });
  if (error) return error.message;
  const result = data as { success?: boolean; error?: string } | null;
  if (!result?.success) return result?.error || "Failed to save draft";
  return null;
}

/**
 * Keepalive flush for form autosave: the browser posts here with
 * `fetch(..., { keepalive: true })` when the tab hides or a modal unmounts.
 * Runs the same draft RPCs as the normal save path, as the cookie user.
 */
export async function POST(request: NextRequest) {
  try {
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

    const raw: unknown = await request.json().catch(() => null);
    const validation = DraftBeaconSchema.safeParse(raw);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const failure = await saveDraft(supabase, user.id, validation.data);
    if (failure) {
      return NextResponse.json({ error: failure }, { status: 409 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Draft beacon save failed:", error);
    return NextResponse.json(
      { error: "Failed to save draft. Please try again." },
      { status: 500 }
    );
  }
}
