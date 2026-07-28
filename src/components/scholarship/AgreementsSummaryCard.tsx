"use client";

import { Fragment, useMemo } from "react";
import { TYPE_LABELS } from "@/components/scholarship/AgreementsQueue";
import type { Database } from "@/types/database";

type Row = Database["public"]["Tables"]["scholarship_agreements"]["Row"];
type AgreementType = Database["public"]["Enums"]["scholarship_agreement_type"];

interface AgreementsSummaryCardProps {
  /** Rows currently in view — the card counts whatever it's handed. */
  rows: Row[];
  /** Which agreement types to show counters for, in display order. */
  types: readonly AgreementType[];
}

/**
 * Compact at-a-glance counter that sits inline with the filter bar (same
 * height, just wider). Counts track the rows passed in, so they reflect the
 * current filtered view.
 *
 *   - "signed"          = both parties done       → status `archived`
 *   - "awaiting school" = student signed, board hasn't → `awaiting_school_signature`
 */
export function AgreementsSummaryCard({
  rows,
  types,
}: AgreementsSummaryCardProps) {
  const counts = useMemo(() => {
    const acc = new Map<AgreementType, { signed: number; awaiting: number }>(
      types.map((t) => [t, { signed: 0, awaiting: 0 }])
    );
    for (const row of rows) {
      const bucket = acc.get(row.agreement_type);
      if (!bucket) continue;
      if (row.status === "archived") bucket.signed += 1;
      else if (row.status === "awaiting_school_signature") bucket.awaiting += 1;
    }
    return acc;
  }, [rows, types]);

  return (
    <div className="flex h-9 items-center gap-4 rounded-md border bg-white px-3 text-sm dark:bg-zinc-950">
      {types.map((type, index) => (
        <Fragment key={type}>
          {index > 0 && (
            <span
              className="h-4 w-px bg-zinc-200 dark:bg-zinc-800"
              aria-hidden="true"
            />
          )}
          <TypeCounts
            label={TYPE_LABELS[type]}
            signed={counts.get(type)?.signed ?? 0}
            awaiting={counts.get(type)?.awaiting ?? 0}
          />
        </Fragment>
      ))}
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
