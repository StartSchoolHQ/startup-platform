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

function TrendIcon({ trend }: { trend: VerdictRow["trend"] }) {
  if (trend === "up")
    return <ArrowUpRight className="inline h-4 w-4 text-emerald-600" />;
  if (trend === "down")
    return <ArrowDownRight className="inline h-4 w-4 text-red-600" />;
  if (trend === "flat")
    return <Minus className="text-muted-foreground inline h-4 w-4" />;
  return <span className="text-muted-foreground">—</span>;
}

function attendance(v: VerdictRow): string {
  if (v.status === "Not tracked") return "—";
  if (v.attendance_incomplete) return "incomplete";
  if (v.attendance_pct == null) return "—";
  return `${v.attendance_pct}% · ${v.attendance_sessions ?? 0}`;
}

export function VerdictTableRow({ v }: { v: VerdictRow }) {
  const tracked = v.status !== "Not tracked";
  return (
    <TableRow className={tracked ? undefined : "text-muted-foreground"}>
      <TableCell className="font-medium">
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
        {v.progress ?? "—"}%
        {v.prev_progress != null && (
          <span className="text-muted-foreground text-xs">
            {" "}
            ← {v.prev_progress}%
          </span>
        )}
      </TableCell>
      <TableCell>
        <TrendIcon trend={v.trend} />
      </TableCell>
      <TableCell className="tabular-nums">
        {v.days_since_login == null ? "never" : `${v.days_since_login} d`}
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
      <TableCell className="max-w-md">
        {v.line ? (
          <>
            <div className="text-sm">{v.line}</div>
            {v.next_step && (
              <div className="text-muted-foreground text-xs">
                Next: {v.next_step}
              </div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground text-sm">{v.reason ?? ""}</div>
        )}
      </TableCell>
    </TableRow>
  );
}
