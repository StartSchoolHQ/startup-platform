"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ProgramTab } from "../program-tab";
import { useOutcomes } from "../use-analytics";
import { BatchCompare } from "./batch-compare";

interface Props {
  active: boolean;
  batchId: string | null;
}

/**
 * Outcomes: the cohort report. Totals, batch-versus-batch on programme week,
 * then the pre-existing retention / departures / accountability views.
 */
export function OutcomesTab({ active, batchId }: Props) {
  const q = useOutcomes(batchId, null, active);
  const totals = q.data && "totals" in q.data.a ? q.data.a.totals : null;

  return (
    <div className="space-y-4">
      {totals && "students" in totals && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Tile label="Students" value={String(totals.students)} />
          <Tile
            label="Still active"
            value={
              totals.students
                ? `${totals.still_active} (${Math.round((100 * totals.still_active) / totals.students)}%)`
                : "—"
            }
          />
          <Tile label="Weekly reports" value={String(totals.reports)} />
          <Tile label="Client meetings" value={String(totals.meetings)} />
          <Tile
            label="MRR (open streams)"
            value={`€${Number(totals.mrr).toLocaleString("en-GB")}`}
          />
        </div>
      )}
      <BatchCompare active={active} batchId={batchId} />
      <ProgramTab active={active} batchId={batchId} />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
