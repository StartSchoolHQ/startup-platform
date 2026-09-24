"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MyJourneyData } from "../types";

interface Props {
  funnel: MyJourneyData["funnel"];
  total: number;
}

/** Students per highest unlocked phase. Plain bars: readable, no chart chrome. */
export function PhaseFunnel({ funnel, total }: Props) {
  const max = Math.max(1, ...funnel.map((f) => f.students));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Where students are</CardTitle>
        <CardDescription>
          Highest phase each student has unlocked. Phases open at 50% of the
          previous one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Fills in when a student starts a task.
          </p>
        ) : (
          <ol className="space-y-3">
            {funnel.map((f) => (
              <li
                key={f.phase_order}
                className="grid grid-cols-[1fr_auto] items-center gap-3"
              >
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>
                      <span className="text-muted-foreground mr-2 tabular-nums">
                        {f.phase_order}.
                      </span>
                      {f.phase_name}
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={f.students}
                    aria-label={`${f.phase_name}: ${f.students} students`}
                    className="bg-muted h-2.5 overflow-hidden rounded-full"
                  >
                    <div
                      className="bg-primary h-full rounded-full transition-[width]"
                      style={{ width: `${(100 * f.students) / max}%` }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right text-sm font-semibold tabular-nums">
                  {f.students}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
