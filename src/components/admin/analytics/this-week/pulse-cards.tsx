"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendIcon } from "../shared";
import type { PulseData } from "../types";

interface Props {
  pulse: PulseData | undefined;
  isLoading: boolean;
}

function Tile({
  title,
  value,
  sub,
  delta,
}: {
  title: string;
  value: string;
  sub?: string;
  delta?: number | null;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-xs">{title}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {delta !== undefined && <TrendIcon delta={delta ?? null} />}
        </div>
        {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function PulseCards({ pulse, isLoading }: Props) {
  if (isLoading || !pulse) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }
  const d = pulse.deltas;
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        title="Active this week"
        value={`${pulse.active_this_week} / ${pulse.students_total}`}
        sub={`${pulse.active_pct}% of students · ${signed(d.active)} vs last week`}
        delta={d.active}
      />
      <Tile
        title="Need attention"
        value={String(pulse.at_risk)}
        sub={
          pulse.at_risk === 0 ? "Nobody flagged" : "flagged by the rules below"
        }
      />
      <Tile
        title="Completions this week"
        value={String(pulse.completions_this_week)}
        sub={`${signed(d.completions)} vs last week`}
        delta={d.completions}
      />
      <Tile
        title="Sentiment (last full week)"
        value={pulse.avg_sentiment === null ? "—" : String(pulse.avg_sentiment)}
        sub={
          pulse.avg_sentiment === null
            ? "No weekly reports yet"
            : d.sentiment === null
              ? "out of 10"
              : `${signed(d.sentiment)} vs the week before`
        }
        delta={d.sentiment}
      />
    </div>
  );
}
