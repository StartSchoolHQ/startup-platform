"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useBatches } from "@/components/diplomas/use-diplomas";

/**
 * Batch scope for the Team Journey admin pages (Analytics, Weekly Reports,
 * Peer Reviews). `null` = current cohort (active users/teams); a uuid = that
 * diploma batch, which is how the archived cohort stays reachable.
 *
 * Kept in the page's `?batch=` search param so a reload keeps the choice.
 */
export function useBatchScope() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: batches, isLoading } = useBatches(true);

  const raw = searchParams.get("batch");
  const batchId = raw && raw !== "current" ? raw : null;

  const setBatchId = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("batch", next);
      else params.delete("batch");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
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
