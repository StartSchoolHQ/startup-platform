"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useBatches } from "@/components/diplomas/use-diplomas";

/** Explicit "all active users/teams" choice; keeps `batch=current` in the url. */
export const ALL_ACTIVE = "current";

/**
 * Batch scope for the Team Journey admin pages (Analytics, Weekly Reports,
 * Peer Reviews). A uuid = that diploma batch; `null` = every active user/team
 * regardless of batch (the legacy "current cohort").
 *
 * Default (no `?batch=`): the single OPEN batch (`closed_at` null) when exactly
 * one exists, so the pages focus on the running cohort. With zero or several
 * open batches the default stays `null`. `?batch=current` always means `null`,
 * which is what `setBatchId(null)` writes so the choice survives a reload
 * instead of snapping back to the open batch.
 *
 * While batches are still loading and no `?batch=` is set, `batchId` is `null`
 * and `isLoading` is true — consumers must hold their queries until it flips,
 * otherwise they fetch "all active" first and the open batch second.
 */
export function useBatchScope() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: batches, isLoading: batchesLoading } = useBatches(true);

  const raw = searchParams.get("batch");
  const open = (batches ?? []).filter((b) => !b.closed_at);
  const defaultBatchId = open.length === 1 ? open[0].id : null;

  const isLoading = !raw && batchesLoading;
  const batchId = raw
    ? raw === ALL_ACTIVE
      ? null
      : raw
    : isLoading
      ? null
      : defaultBatchId;

  const setBatchId = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("batch", next ?? ALL_ACTIVE);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return { batchId, setBatchId, batches: batches ?? [], isLoading };
}

/** Appends the scope to an API url so routes can forward it to the RPC. */
export function withBatch(url: string, batchId: string | null): string {
  if (!batchId) return url;
  return `${url}${url.includes("?") ? "&" : "?"}batch=${batchId}`;
}
