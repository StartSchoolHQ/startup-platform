"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ReviewQualityRow } from "../types";

interface Props {
  rows: ReviewQualityRow[];
  onSelect: (row: ReviewQualityRow) => void;
}

function rateClass(rate: number | null): string {
  if (rate === null) return "text-muted-foreground";
  if (rate < 40) return "text-red-600";
  if (rate < 70) return "text-amber-600";
  return "text-emerald-600";
}

export function ReviewQualityTable({ rows, onSelect }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Which tasks are hard</CardTitle>
        <CardDescription>
          One row per task anyone has started. Most rejected first. Click a row
          to read the reviewer&apos;s reasons.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Fills in when a task in this cohort has been started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Journey</TableHead>
                <TableHead className="text-right">Started</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">First pass</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead className="text-right">Median h</TableHead>
                <TableHead className="text-right">Rejections</TableHead>
                <TableHead className="text-right">Stale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const rate =
                  r.first_pass_rate === null ? null : Number(r.first_pass_rate);
                return (
                  <TableRow
                    key={r.task_id}
                    className="cursor-pointer"
                    onClick={() => onSelect(r)}
                  >
                    <TableCell className="max-w-xs">
                      <div className="truncate font-medium">{r.title}</div>
                      {r.phase && (
                        <div className="text-muted-foreground truncate text-xs">
                          {r.phase}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.journey}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.started}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.approved}
                    </TableCell>
                    <TableCell
                      className={cn("text-right tabular-nums", rateClass(rate))}
                    >
                      {rate === null ? "—" : `${rate}%`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.mean_attempts ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.median_hours ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.rejections}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.stale_in_progress > 0 ? (
                        <Badge variant="outline" className="text-amber-700">
                          {r.stale_in_progress}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
