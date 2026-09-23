"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { scoreTone } from "@/components/weekly-reports/shared/pickers";
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
  });
}

function StatusIcon({ status }: { status: CommitmentStatus }) {
  if (status === "completed")
    return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />;
  if (status === "in_progress")
    return <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />;
  return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />;
}

const TONE_BAR = {
  low: "bg-red-500",
  mid: "bg-amber-500",
  high: "bg-green-500",
};

function Answer({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1 text-sm">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      {children}
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground italic">Not provided</span>;
}

/** The student's last submitted solo reports, newest first, as a timeline. */
export function IndividualWeeklyReportHistory({
  open,
  onOpenChange,
  entries,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="space-y-1.5 px-6 pt-6 pb-5 text-left">
          <p className="text-primary text-xs font-medium">My Journey</p>
          <DialogTitle className="text-xl leading-snug font-semibold tracking-tight">
            Past weekly reports
          </DialogTitle>
          <DialogDescription className="text-sm">
            {entries.length === 0
              ? "Nothing submitted yet."
              : `Your last ${entries.length} submitted ${entries.length === 1 ? "report" : "reports"}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto border-t px-6 py-6">
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Your first report will show up here once you submit it.
            </p>
          ) : (
            <ol className="before:bg-border/80 relative space-y-8 before:absolute before:top-4 before:bottom-4 before:left-[13px] before:w-px">
              {entries.map((entry) => {
                const d = entry.submission_data;
                const score = d?.alignmentScore ?? null;
                return (
                  <li key={entry.id} className="relative pl-11">
                    <span
                      aria-hidden
                      className="bg-primary/10 text-primary ring-background absolute top-0 left-0 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ring-4"
                    >
                      {entry.week_number}
                    </span>
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-sm font-semibold">
                          Week {entry.week_number}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatDate(entry.week_start_date)} –{" "}
                          {formatDate(entry.week_end_date)} · submitted{" "}
                          {formatDate(entry.submitted_at)}
                        </span>
                      </div>

                      <Answer label="Commitments">
                        {d?.commitments?.length ? (
                          <ul className="space-y-1.5">
                            {d.commitments.map((c, j) => (
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
                        ) : (
                          <Empty />
                        )}
                      </Answer>

                      {d?.blockers && (
                        <Answer label="Blockers">
                          <p className="whitespace-pre-wrap">{d.blockers}</p>
                        </Answer>
                      )}

                      <Answer label="Next week">
                        {d?.nextWeekCommitments?.length ? (
                          <ul className="list-disc space-y-0.5 pl-5">
                            {d.nextWeekCommitments.map((c, j) => (
                              <li key={j}>{c}</li>
                            ))}
                          </ul>
                        ) : (
                          <Empty />
                        )}
                      </Answer>

                      <Answer label="Motivation">
                        {score === null ? (
                          <Empty />
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <div className="bg-muted relative h-1.5 flex-1 overflow-hidden rounded-full">
                                <div
                                  className={cn(
                                    "absolute inset-y-0 left-0 rounded-full",
                                    TONE_BAR[scoreTone(score)]
                                  )}
                                  style={{ width: `${(score / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold tabular-nums">
                                {score}/10
                              </span>
                            </div>
                            {d?.alignmentReason && (
                              <p className="text-muted-foreground whitespace-pre-wrap">
                                {d.alignmentReason}
                              </p>
                            )}
                          </div>
                        )}
                      </Answer>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
