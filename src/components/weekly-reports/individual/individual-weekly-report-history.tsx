"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type {
  CommitmentStatus,
  IndividualWeeklyReportHistoryEntry,
} from "@/types/weekly-report";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: IndividualWeeklyReportHistoryEntry[];
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusIcon({ status }: { status: CommitmentStatus }) {
  if (status === "completed")
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />;
  if (status === "in_progress")
    return <Clock className="h-4 w-4 shrink-0 text-amber-600" />;
  return <XCircle className="h-4 w-4 shrink-0 text-red-600" />;
}

/** Read-only list of the student's last submitted solo reports. */
export function IndividualWeeklyReportHistory({
  open,
  onOpenChange,
  entries,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Past weekly reports</DialogTitle>
          <DialogDescription>
            Your last {entries.length} submitted My Journey reports.
          </DialogDescription>
        </DialogHeader>

        {entries.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No reports submitted yet.
          </p>
        ) : (
          <div className="space-y-6">
            {entries.map((entry, i) => {
              const d = entry.submission_data;
              return (
                <div key={entry.id} className="space-y-3">
                  {i > 0 && <Separator />}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      Week {entry.week_number}
                    </span>
                    <Badge variant="secondary" className="font-normal">
                      {formatDate(entry.week_start_date)} –{" "}
                      {formatDate(entry.week_end_date)}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      Submitted {formatDate(entry.submitted_at)}
                    </span>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs font-semibold">
                      Commitments
                    </p>
                    <ul className="mt-1 space-y-1">
                      {(d?.commitments ?? []).map((c, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <StatusIcon status={c.status} />
                          <span>
                            {c.text}
                            {c.explanation && (
                              <span className="text-muted-foreground">
                                {" "}
                                — {c.explanation}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {d?.blockers && (
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs font-semibold">
                        Blockers
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{d.blockers}</p>
                    </div>
                  )}

                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs font-semibold">
                      Next week
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                      {(d?.nextWeekCommitments ?? []).map((c, j) => (
                        <li key={j}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-sm">
                    <span className="text-muted-foreground text-xs font-semibold">
                      Alignment
                    </span>{" "}
                    <span className="font-semibold tabular-nums">
                      {d?.alignmentScore ?? "—"}/10
                    </span>
                    {d?.alignmentReason && (
                      <span className="text-muted-foreground">
                        {" "}
                        — {d.alignmentReason}
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
