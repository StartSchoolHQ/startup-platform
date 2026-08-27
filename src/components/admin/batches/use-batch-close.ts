"use client";

// React Query hooks for closing/reopening a cohort batch.
// Key namespace: ["admin-batches", <slice>]

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  BatchClosePreview,
  CloseBatchResult,
  ReopenBatchResult,
  RetryBansResult,
} from "@/lib/batches/types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function postJson<T>(url: string, body: unknown = {}): Promise<T> {
  return fetchJson<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function useBatchClosePreview(batchId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-batches", "close-preview", batchId],
    queryFn: () =>
      fetchJson<BatchClosePreview>(
        `/api/admin/batches/preview?batchId=${batchId}`
      ),
    enabled,
    staleTime: 0,
  });
}

function useInvalidateBatches() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-diplomas", "batches"] });
    queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
  };
}

export function useCloseBatch() {
  const invalidate = useInvalidateBatches();
  return useMutation({
    retry: 0,
    mutationFn: (input: {
      batchId: string;
      userIds: string[];
      teamIds: string[];
    }) =>
      postJson<CloseBatchResult>(`/api/admin/batches/${input.batchId}/close`, {
        userIds: input.userIds,
        teamIds: input.teamIds,
      }),
    onSuccess: (r) => {
      toast.success(
        `Batch closed — ${r.users_archived} users and ${r.teams_archived} teams archived`
      );
      invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to close batch");
    },
  });
}

export function useReopenBatch() {
  const invalidate = useInvalidateBatches();
  return useMutation({
    retry: 0,
    mutationFn: (batchId: string) =>
      postJson<ReopenBatchResult>(`/api/admin/batches/${batchId}/reopen`),
    onSuccess: (r) => {
      toast.success(
        `Batch reopened — ${r.users_reopened} users and ${r.teams_reopened} teams restored`
      );
      invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reopen batch");
    },
  });
}

export function useRetryBans() {
  return useMutation({
    retry: 0,
    mutationFn: (batchId: string) =>
      postJson<RetryBansResult>(`/api/admin/batches/${batchId}/retry-bans`),
    onSuccess: (r) => {
      toast.success(
        `${r.banned} accounts banned, ${r.alreadyBanned} already banned, ${r.banFailures.length} failed`
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to retry bans");
    },
  });
}
