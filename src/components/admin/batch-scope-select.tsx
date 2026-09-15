"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_ACTIVE, useBatchScope } from "@/hooks/use-batch-scope";

/**
 * One diploma batch, the open one by default; closed batches stay reachable
 * for diplomas and retention. Shared by every admin page. "All active"
 * (`?batch=current`) still works by URL but is not offered in the list.
 */
export function BatchScopeSelect({ className }: { className?: string }) {
  const { batchId, setBatchId, batches, isLoading } = useBatchScope();
  const open = batches.filter((b) => !b.closed_at);
  const closed = batches.filter((b) => b.closed_at);

  return (
    <Select
      value={batchId ?? ALL_ACTIVE}
      onValueChange={(v) => setBatchId(v === ALL_ACTIVE ? null : v)}
      disabled={isLoading}
    >
      <SelectTrigger className={className ?? "w-[220px]"} aria-label="Cohort">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {open.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name} (open)
          </SelectItem>
        ))}
        {closed.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name} · closed
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
