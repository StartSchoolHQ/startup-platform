"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBatchScope } from "@/hooks/use-batch-scope";

/**
 * "Current cohort" or one diploma batch. Shared by every Team Journey admin
 * page so archived cohorts never count unless the admin asks for them.
 */
export function BatchScopeSelect({ className }: { className?: string }) {
  const { batchId, setBatchId, batches } = useBatchScope();

  return (
    <Select
      value={batchId ?? "current"}
      onValueChange={(v) => setBatchId(v === "current" ? null : v)}
    >
      <SelectTrigger className={className ?? "w-[220px]"} aria-label="Cohort">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="current">Current cohort</SelectItem>
        {batches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
            {b.closed_at ? " · closed" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
