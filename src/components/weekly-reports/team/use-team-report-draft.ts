"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import posthog from "posthog-js";
import {
  useAutosaveDraft,
  type UseAutosaveDraftResult,
} from "@/hooks/use-autosave-draft";
import { sendDraftBeacon } from "@/lib/drafts/beacon";
import { createClient } from "@/lib/supabase/client";
import {
  emptyTeamReportForm,
  hasTeamReportContent,
  normalizeTeamReport,
  teamDraftToForm,
} from "@/lib/team-weekly-report";
import {
  getCurrentWeekBoundaries,
  type WeekBoundaries,
} from "@/lib/weekly-reports";
import type { TeamWeeklyReportForm } from "@/types/weekly-report";

interface TeamDraftOpenRead {
  week: WeekBoundaries;
  draft: {
    id: string;
    data: Partial<TeamWeeklyReportForm>;
    updatedAt: string | null;
  } | null;
}

/** This week's boundaries (shared 10:00 cutoff) + the team draft row. */
async function readTeamDraftOnOpen(
  teamId: string,
  userId: string
): Promise<TeamDraftOpenRead> {
  const week = await getCurrentWeekBoundaries();
  if (!week) throw new Error("Failed to get current week boundaries");
  const { data, error } = await createClient()
    .from("weekly_reports")
    .select("id, submission_data, updated_at")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .eq("context", "team")
    .eq("week_number", week.week_number)
    .eq("week_year", week.week_year)
    .eq("status", "draft")
    .maybeSingle();
  if (error) throw new Error(`Failed to load draft: ${error.message}`);
  const draft = data?.submission_data
    ? {
        id: data.id,
        data: data.submission_data as Partial<TeamWeeklyReportForm>,
        updatedAt: data.updated_at,
      }
    : null;
  return { week, draft };
}

/**
 * Upserts this week's team draft via `save_weekly_report_draft` (which
 * answers `{ success: false, error }` instead of throwing). Returns the
 * draft row id.
 */
export async function saveTeamReportDraft(args: {
  userId: string;
  teamId: string;
  week: WeekBoundaries;
  form: TeamWeeklyReportForm;
}): Promise<string> {
  const { week } = args;
  const { data, error } = await createClient().rpc("save_weekly_report_draft", {
    p_user_id: args.userId,
    p_team_id: args.teamId,
    p_week_start_date: week.week_start,
    p_week_end_date: week.week_end,
    p_week_number: week.week_number,
    p_week_year: week.week_year,
    p_submission_data: normalizeTeamReport(args.form) as never,
  });
  if (error) throw new Error(`Failed to save draft: ${error.message}`);
  const result = data as {
    success?: boolean;
    error?: string;
    report_id?: string;
  } | null;
  if (!result?.success) {
    if (result?.error?.includes("already been submitted"))
      throw new Error("This week's report was already submitted.");
    throw new Error(result?.error || "Failed to save draft");
  }
  return result.report_id as string;
}

/**
 * Restore + autosave for the team form. Each open refetches the week and
 * this week's DB draft, seeds the form once that settled, then saves edits
 * silently (no toast). No browser storage: the DB row is the only draft.
 */
export function useTeamReportDraft({
  open,
  teamId,
  userId,
}: {
  open: boolean;
  teamId: string;
  userId: string;
}) {
  const [form, setFormState] = useState(emptyTeamReportForm);
  const [existingDraftId, setExistingDraftId] = useState<string | null>(null);
  // Read by submit after awaiting an in-flight save (state may lag a render).
  const draftIdRef = useRef<string | null>(null);
  useEffect(() => {
    draftIdRef.current = existingDraftId;
  }, [existingDraftId]);
  const query = useQuery({
    queryKey: ["weekly-reports", "team", "draft-open", teamId, userId],
    queryFn: () => readTeamDraftOnOpen(teamId, userId),
    enabled: open && !!teamId && !!userId,
    staleTime: 0,
    refetchOnMount: "always",
    // Only the open itself fetches: a focus refetch mid-typing would lock it.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const isLoadingDraft = open && query.isFetching;

  // Seed once per open, after that open's fetch settled. Adjust-state-during-
  // render, not an effect.
  const [openState, setOpenState] = useState({ open: false, count: 0 });
  if (open !== openState.open) {
    setOpenState({ open, count: open ? openState.count + 1 : openState.count });
  }
  const [seededFor, setSeededFor] = useState(0);
  const [restoredOpen, setRestoredOpen] = useState<number | null>(null);
  // A failed read never seeds (TanStack keeps the last open's data on error).
  const loadError = open && !isLoadingDraft && query.isError;
  if (
    open &&
    !isLoadingDraft &&
    !query.isError &&
    seededFor !== openState.count
  ) {
    setSeededFor(openState.count);
    const row = query.data?.draft ?? null;
    const seed = row ? teamDraftToForm(row.data) : emptyTeamReportForm();
    setFormState(seed);
    setExistingDraftId(row?.id ?? null);
    // An empty restored draft (e.g. after Clear) gets no chip and no event.
    setRestoredOpen(row && hasTeamReportContent(seed) ? openState.count : null);
  }
  useEffect(() => {
    if (restoredOpen === null) return;
    posthog.capture("weekly_report_draft_restored", { context: "team" });
  }, [restoredOpen]);

  // Only this open's settled, successful read counts (never a stale week).
  const week =
    open && !isLoadingDraft && !query.isError
      ? (query.data?.week ?? null)
      : null;
  const save = useCallback(
    async (value: TeamWeeklyReportForm) => {
      if (!week) throw new Error("Failed to get current week boundaries");
      const id = await saveTeamReportDraft({
        userId,
        teamId,
        week,
        form: value,
      });
      draftIdRef.current = id;
      setExistingDraftId(id);
    },
    [userId, teamId, week]
  );
  const beacon = useCallback(
    (value: TeamWeeklyReportForm) =>
      sendDraftBeacon({
        kind: "team_report",
        teamId,
        data: { ...normalizeTeamReport(value) },
      }),
    [teamId]
  );
  const autosave: UseAutosaveDraftResult = useAutosaveDraft({
    // A failed open read (week or draft) keeps autosave off for this open.
    enabled: week !== null,
    value: form,
    // Once a row exists, Clear still writes (an empty draft, no stale text).
    canSave: (value) => hasTeamReportContent(value) || existingDraftId !== null,
    save,
    beacon,
  });

  const reset = useCallback(() => {
    setFormState(emptyTeamReportForm());
    setRestoredOpen(null);
  }, []);

  const updatedAt = query.data?.draft?.updatedAt;
  return {
    form,
    setFormState,
    isLoadingDraft,
    existingDraftId,
    getDraftId: () => draftIdRef.current,
    loadError,
    retryLoad: () => void query.refetch(),
    restoredFromDb: !isLoadingDraft && open && restoredOpen === openState.count,
    reset,
    week,
    autosave,
    savedAt: updatedAt ? new Date(updatedAt) : null,
  };
}
