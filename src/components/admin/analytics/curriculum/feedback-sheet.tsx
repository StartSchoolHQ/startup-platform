"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ReviewQualityRow } from "../types";

interface Props {
  row: ReviewQualityRow | null;
  onClose: () => void;
}

/** The reviewer's last few rejection reasons for one task. */
export function FeedbackSheet({ row, onClose }: Props) {
  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        {row && (
          <>
            <SheetHeader>
              <SheetTitle className="pr-6">{row.title}</SheetTitle>
              <SheetDescription>
                {row.journey}
                {row.phase ? ` · ${row.phase}` : ""} · {row.started} started,{" "}
                {row.approved} approved, {row.rejections} rejections
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-6">
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <Stat
                  label="First pass"
                  value={
                    row.first_pass_rate === null
                      ? "—"
                      : `${row.first_pass_rate}%`
                  }
                />
                <Stat
                  label="Attempts"
                  value={
                    row.mean_attempts === null ? "—" : String(row.mean_attempts)
                  }
                />
                <Stat
                  label="Median hours"
                  value={
                    row.median_hours === null ? "—" : String(row.median_hours)
                  }
                />
              </dl>
              <div>
                <h4 className="mb-2 text-sm font-medium">
                  Why the reviewer said no
                </h4>
                {row.sample_feedback.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No rejection feedback recorded for this task.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {row.sample_feedback.map((f, i) => (
                      <li
                        key={i}
                        className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-md p-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
