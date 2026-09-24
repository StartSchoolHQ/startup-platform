"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TabError, TabSkeleton } from "../shared";
import type { ReviewQualityRow } from "../types";
import { useReviewQuality } from "../use-analytics";
import { FeedbackSheet } from "./feedback-sheet";
import { ReviewQualityTable } from "./review-quality-table";

interface Props {
  active: boolean;
  batchId: string | null;
}

/** Curriculum quality across both journeys: which tasks fail, and why. */
export function CurriculumTab({ active, batchId }: Props) {
  const q = useReviewQuality(batchId, active);
  const [selected, setSelected] = useState<ReviewQualityRow | null>(null);

  if (q.isLoading) return <TabSkeleton />;
  if (q.isError || !q.data) {
    return (
      <TabError
        message="Couldn't load curriculum analytics."
        onRetry={() => q.refetch()}
      />
    );
  }
  const rows = q.data;
  const stale = rows.reduce((n, r) => n + r.stale_in_progress, 0);
  const lowPass = rows.filter(
    (r) =>
      r.first_pass_rate !== null &&
      Number(r.first_pass_rate) < 50 &&
      r.started >= 3
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Tasks with activity" value={String(rows.length)} />
        <Tile
          label="Tasks under 50% first pass"
          value={String(lowPass)}
          sub="with 3+ starts"
        />
        <Tile
          label="Stale in progress"
          value={String(stale)}
          sub="started, never submitted"
        />
      </div>
      <ReviewQualityTable rows={rows} onSelect={setSelected} />
      <FeedbackSheet row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
      </CardContent>
    </Card>
  );
}
