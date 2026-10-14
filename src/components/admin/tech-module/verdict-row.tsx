"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  Minus,
} from "lucide-react";
import { STATUS_TONE } from "./summary";
import type { VerdictRow } from "@/types/program-assistant";

export const VERDICT_COLUMNS = 6;

function TrendIcon({ trend }: { trend: VerdictRow["trend"] }) {
  if (trend === "up")
    return <ArrowUpRight className="inline h-4 w-4 text-emerald-600" />;
  if (trend === "down")
    return <ArrowDownRight className="inline h-4 w-4 text-red-600" />;
  if (trend === "flat")
    return <Minus className="text-muted-foreground inline h-4 w-4" />;
  return null;
}

function attendance(v: VerdictRow): string {
  if (v.status === "Not tracked") return "—";
  if (v.attendance_incomplete) return "incomplete";
  if (v.attendance_pct == null) return "—";
  return `${v.attendance_pct}% · ${v.attendance_sessions ?? 0} sessions`;
}

/**
 * One student = a compact numbers row, plus a full-width note row when
 * Claude wrote one (Talk to / Watch). Table cells do not wrap by default, so
 * the note gets its own row instead of a squeezed column.
 */
export function VerdictTableRow({ v }: { v: VerdictRow }) {
  const tracked = v.status !== "Not tracked";
  const hasNote = !!v.line;
  return (
    <>
      <TableRow
        className={[
          tracked ? "" : "text-muted-foreground",
          hasNote ? "border-b-0" : "",
        ].join(" ")}
      >
        <TableCell className="font-medium whitespace-normal">
          <div className="flex items-center gap-1">
            {v.name ?? v.login ?? v.qwasar_user_id}
            {v.user_id && (
              <Link
                href="/dashboard/admin/users"
                className="text-muted-foreground hover:text-foreground"
                title="Open platform profile"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <div className="text-muted-foreground text-xs">
            {v.track ?? "?"} · {v.study_type ?? "no track row"}
          </div>
        </TableCell>
        <TableCell className="tabular-nums">
          <span className="font-medium">{v.progress ?? "—"}%</span>{" "}
          <TrendIcon trend={v.trend} />
          {v.prev_progress != null && (
            <div className="text-muted-foreground text-xs">
              was {v.prev_progress}% a week ago
            </div>
          )}
        </TableCell>
        <TableCell className="tabular-nums">
          {v.days_since_login == null ? "never" : `${v.days_since_login} d ago`}
        </TableCell>
        <TableCell className="tabular-nums">{attendance(v)}</TableCell>
        <TableCell>
          <Badge variant="outline" className={STATUS_TONE[v.status]}>
            {v.status}
          </Badge>
          {v.not_evaluated_reason && (
            <div className="text-muted-foreground text-xs">
              {v.not_evaluated_reason}
            </div>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground max-w-xs text-xs whitespace-normal">
          {v.reason ?? ""}
        </TableCell>
      </TableRow>
      {hasNote && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell
            colSpan={VERDICT_COLUMNS}
            className="pt-0 pb-3 pl-4 whitespace-normal"
          >
            <div className="grid gap-x-6 gap-y-1 text-sm md:grid-cols-2">
              <div>
                <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Why
                </span>
                <p>{v.line}</p>
              </div>
              {v.next_step && (
                <div>
                  <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                    Next step
                  </span>
                  <p>{v.next_step}</p>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
