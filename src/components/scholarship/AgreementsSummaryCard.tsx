"use client";

import { useMemo } from "react";
import type { Database } from "@/types/database";

type Row = Database["public"]["Tables"]["scholarship_agreements"]["Row"];

interface AgreementsSummaryCardProps {
  /** Rows currently in view — the card counts whatever it's handed. */
  rows: Row[];
}

/**
 * Compact at-a-glance counter that sits inline with the filter bar (same
 * height, just wider). Counts track the rows passed in, so they reflect the
 * current filtered view.
 *
 *   - "signed"          = both parties done       → status `archived`
 *   - "awaiting school" = student signed, board hasn't → `awaiting_school_signature`
 */
export function AgreementsSummaryCard({ rows }: AgreementsSummaryCardProps) {
  const counts = useMemo(() => {
    const acc = {
      full: { signed: 0, awaiting: 0 },
      partial: { signed: 0, awaiting: 0 },
    };
    for (const row of rows) {
      // Only full/partial are surfaced; ignore any other enum value.
      const bucket =
        row.agreement_type === "full"
          ? acc.full
          : row.agreement_type === "partial"
            ? acc.partial
            : null;
      if (!bucket) continue;
      if (row.status === "archived") bucket.signed += 1;
      else if (row.status === "awaiting_school_signature") bucket.awaiting += 1;
    }
    return acc;
  }, [rows]);

  return (
    <div className="flex h-9 items-center gap-4 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950">
      <TypeCounts
        label="Full"
        signed={counts.full.signed}
        awaiting={counts.full.awaiting}
      />
      <span
        className="h-4 w-px bg-zinc-200 dark:bg-zinc-800"
        aria-hidden="true"
      />
      <TypeCounts
        label="Partial"
        signed={counts.partial.signed}
        awaiting={counts.partial.awaiting}
      />
    </div>
  );
}

function TypeCounts({
  label,
  signed,
  awaiting,
}: {
  label: string;
  signed: number;
  awaiting: number;
}) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="font-medium">{label}</span>
      <span className="text-zinc-500">
        <Count value={signed} /> signed{" · "}
        <Count value={awaiting} /> awaiting school
      </span>
    </span>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
      {value}
    </span>
  );
}
