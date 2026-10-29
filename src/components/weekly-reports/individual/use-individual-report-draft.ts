"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchIndividualWeeklyReportStatus,
  individualWeeklyReportKeys,
  saveIndividualReportDraftSilently,
} from "@/hooks/use-individual-weekly-report";
import {
  useAutosaveDraft,
  type UseAutosaveDraftResult,
} from "@/hooks/use-autosave-draft";
import { sendDraftBeacon } from "@/lib/drafts/beacon";
import {
  hasIndividualReportContent,
  normalizeIndividualReport,
} from "@/lib/individual-weekly-report";
import { createClient } from "@/lib/supabase/client";
import type {
  IndividualWeeklyReportData,
  IndividualWeeklyReportForm,
} from "@/types/weekly-report";

interface DraftOpenRead {
  draft: Partial<IndividualWeeklyReportData> | null;
  savedAt: string | null;
}

/** Refetches the status (the draft) and reads the draft row's updated_at. */
async function readDraftOnOpen(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string
): Promise<DraftOpenRead> {
  const status = await queryClient.fetchQuery({
    queryKey: individualWeeklyReportKeys.status(userId),
    queryFn: fetchIndividualWeeklyReportStatus,
    staleTime: 0,
  });
  if (!status.draft) return { draft: null, savedAt: null };
  // Owner-select under RLS. Only feeds the chip's age, so a failure here
  // just drops the age instead of blocking the restore.
  const { data } = await createClient()
    .from("weekly_reports")
    .select("updated_at")
    .eq("user_id", userId)
    .eq("context", "individual")
    .eq("status", "draft")
    .eq("week_year", status.week.week_year)
    .eq("week_number", status.week.week_number)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { draft: status.draft, savedAt: data?.updated_at ?? null };
}

/**
 * Restore + autosave for the solo weekly report. Each open refetches the
 * status (the current week's draft) and saves edits once that settled.
 * Saves go through `saveIndividualReportDraftSilently` — never the toasting
 * submit mutation. `form` must be state (stable identity per edit).
 */
export function useIndividualReportDraft({
  open,
  userId,
  form,
}: {
  open: boolean;
  userId?: string;
  form: IndividualWeeklyReportForm;
}): {
  loading: boolean;
  draft: Partial<IndividualWeeklyReportData> | null;
  savedAt: Date | null;
  hasRow: boolean;
  autosave: UseAutosaveDraftResult;
} {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: individualWeeklyReportKeys.draftOpen(userId),
    queryFn: () => readDraftOnOpen(queryClient, userId!),
    enabled: open && !!userId,
    staleTime: 0,
    refetchOnMount: "always",
    // Only the open itself fetches: a focus/reconnect refetch mid-typing
    // would flip `loading` and lock the form.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const loading = open && !!userId && query.isFetching;
  // A row exists if the open found one or an autosave wrote one since.
  const hasRow = !!query.data?.draft;

  const save = useCallback(
    async (value: IndividualWeeklyReportForm) => {
      if (!userId) return;
      const data = normalizeIndividualReport(value);
      await saveIndividualReportDraftSilently(queryClient, userId, data);
      queryClient.setQueryData<DraftOpenRead>(
        individualWeeklyReportKeys.draftOpen(userId),
        (old) => old && { ...old, draft: data }
      );
    },
    [userId, queryClient]
  );

  const beacon = useCallback((value: IndividualWeeklyReportForm) => {
    sendDraftBeacon({
      kind: "solo_report",
      data: { ...normalizeIndividualReport(value) },
    });
  }, []);

  const autosave = useAutosaveDraft<IndividualWeeklyReportForm>({
    // A failed restore read must not let an autosave overwrite the row.
    enabled: open && !!userId && !loading && !query.isError,
    value: form,
    // Once a row exists, Clear still writes (an empty draft, no stale text).
    canSave: (value) => hasIndividualReportContent(value) || hasRow,
    save,
    beacon,
  });

  const savedAt = query.data?.savedAt;
  return {
    loading,
    draft: query.data?.draft ?? null,
    savedAt: savedAt ? new Date(savedAt) : null,
    hasRow,
    autosave,
  };
}
