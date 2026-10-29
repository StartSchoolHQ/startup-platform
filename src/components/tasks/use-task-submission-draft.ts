"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTaskSubmissionDraft,
  saveTaskSubmissionDraft,
  taskDraftKeys,
  type TaskDraft,
  type TaskDraftBody,
} from "@/lib/database";
import { sendDraftBeacon } from "@/lib/drafts/beacon";
import {
  useAutosaveDraft,
  type UseAutosaveDraftResult,
} from "@/hooks/use-autosave-draft";

/**
 * Restore + autosave for the task submission modal. Fetches the caller's
 * draft each time the modal opens (the draft RPCs are the only correct read
 * path for team tasks) and saves edits once that fetch has settled.
 * `value` must be a stable object (state or useMemo) — see useAutosaveDraft.
 */
export function useTaskSubmissionDraft({
  open,
  progressId,
  value,
  canSave,
}: {
  open: boolean;
  progressId: string | null;
  value: TaskDraftBody;
  /** The form has content worth saving (an existing row is added here). */
  canSave: boolean;
}): {
  loading: boolean;
  /** This open's read failed: no seed, no autosave, show Retry. */
  loadError: boolean;
  retryLoad: () => void;
  draft: TaskDraft | null;
  autosave: UseAutosaveDraftResult;
} {
  const queryClient = useQueryClient();
  // TeamTask uses "none" for a task that has no progress row yet.
  const id = progressId && progressId !== "none" ? progressId : null;

  const query = useQuery({
    queryKey: taskDraftKeys.one(id ?? ""),
    queryFn: () => getTaskSubmissionDraft(id!),
    enabled: open && !!id,
    // One retry, so "Checking for a saved draft…" does not hang offline.
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
    // Only the open itself fetches: a focus/reconnect refetch mid-typing
    // would flip `loading` and hide the form.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const loading = open && !!id && query.isFetching;
  // TanStack keeps the last open's data on error, so a failed read must
  // neither seed the form nor let an autosave overwrite the real draft.
  const loadError = open && !!id && !loading && query.isError;

  const save = useCallback(
    async (draft: TaskDraftBody) => {
      if (!id) return;
      await saveTaskSubmissionDraft(id, draft);
      const next: TaskDraft = {
        draft,
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData(taskDraftKeys.one(id), next);
    },
    [id, queryClient]
  );

  const beacon = useCallback(
    (draft: TaskDraftBody) => {
      if (id) sendDraftBeacon({ kind: "task", progressId: id, draft });
    },
    [id]
  );

  const autosave = useAutosaveDraft<TaskDraftBody>({
    enabled: open && !!id && !loading && !query.isError,
    value,
    // Once a row exists, clearing the form still writes (no stale text).
    canSave: () => canSave || !!query.data,
    save,
    beacon,
  });

  return {
    loading,
    loadError,
    retryLoad: () => void query.refetch(),
    draft: id ? (query.data ?? null) : null,
    autosave,
  };
}
