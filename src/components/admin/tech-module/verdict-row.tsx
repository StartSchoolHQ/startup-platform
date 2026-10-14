"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { attendanceLabel, loginLabel } from "./verdict-card";
import type { VerdictRow } from "@/types/program-assistant";

export const VERDICT_COLUMNS = 5;

function Trend({ trend }: { trend: VerdictRow["trend"] }) {
  if (trend === "up")
    return <ArrowUpRight className="inline h-3.5 w-3.5 text-emerald-600" />;
  if (trend === "down")
    return <ArrowDownRight className="inline h-3.5 w-3.5 text-red-600" />;
  if (trend === "flat")
    return <Minus className="text-muted-foreground inline h-3.5 w-3.5" />;
  return null;
}

/** Compact one-line row for the collapsed On pace / Not tracked lists. */
export function VerdictTableRow({ v }: { v: VerdictRow }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {v.name ?? v.login ?? v.qwasar_user_id}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {v.track ?? "?"} · {v.study_type ?? "no track row"}
      </TableCell>
      <TableCell className="tabular-nums">
        {v.progress ?? "—"}% <Trend trend={v.trend} />
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {loginLabel(v)}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {attendanceLabel(v) ?? "—"}
      </TableCell>
    </TableRow>
  );
}
