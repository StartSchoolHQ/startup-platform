"use client";

import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { STATUS_TONE } from "./summary";
import type { VerdictRow } from "@/types/program-assistant";

function Trend({ trend }: { trend: VerdictRow["trend"] }) {
  if (trend === "up")
    return <ArrowUpRight className="inline h-3.5 w-3.5 text-emerald-600" />;
  if (trend === "down")
    return <ArrowDownRight className="inline h-3.5 w-3.5 text-red-600" />;
  if (trend === "flat")
    return <Minus className="text-muted-foreground inline h-3.5 w-3.5" />;
  return null;
}

export function loginLabel(v: VerdictRow): string {
  if (v.days_since_login == null) return "never logged in";
  if (v.days_since_login === 0) return "logged in today";
  return `${v.days_since_login} d since login`;
}

export function attendanceLabel(v: VerdictRow): string | null {
  if (v.status === "Not tracked") return null;
  if (v.attendance_incomplete) return "attendance incomplete";
  if (v.attendance_pct == null) return null;
  return `${v.attendance_pct}% attendance`;
}

/** One flagged student: the numbers in one line, then why and what to do. */
export function VerdictCard({ v }: { v: VerdictRow }) {
  const stats = [
    <span key="p" className="text-foreground font-medium tabular-nums">
      {v.progress ?? "—"}% <Trend trend={v.trend} />
      {v.prev_progress != null && v.prev_progress !== v.progress && (
        <span className="text-muted-foreground font-normal">
          {" "}
          from {v.prev_progress}%
        </span>
      )}
    </span>,
    <span key="l">{loginLabel(v)}</span>,
    attendanceLabel(v) && <span key="a">{attendanceLabel(v)}</span>,
  ].filter(Boolean);

  return (
    <div className="bg-card flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">
            {v.name ?? v.login ?? v.qwasar_user_id}
          </div>
          <div className="text-muted-foreground text-xs">
            {v.track ?? "?"} · {v.study_type ?? "no track row"}
            {v.not_evaluated_reason && <> · {v.not_evaluated_reason}</>}
          </div>
        </div>
        <Badge variant="outline" className={STATUS_TONE[v.status]}>
          {v.status}
        </Badge>
      </div>
      <div
        className="text-muted-foreground flex flex-wrap gap-x-3 text-xs"
        title={v.reason ?? undefined}
      >
        {stats.map((s, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>·</span>}
            {s}
          </span>
        ))}
      </div>
      {v.line ? (
        <p className="text-sm leading-snug">{v.line}</p>
      ) : (
        <p className="text-muted-foreground text-sm">{v.reason}</p>
      )}
      {v.next_step && (
        <p className="text-muted-foreground text-sm leading-snug">
          <span className="text-foreground font-medium">Next:</span>{" "}
          {v.next_step}
        </p>
      )}
    </div>
  );
}
