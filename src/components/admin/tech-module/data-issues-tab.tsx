"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useResolveDataIssue } from "@/hooks/use-program-assistant";
import type { DataIssueRow } from "@/types/program-assistant";

const KIND_LABEL: Record<string, string> = {
  active_no_track_row: "No track row",
  dropout_but_active: "Dropout but active",
  import_warning: "Sheet vs Qwasar",
  wrong_track: "Wrong track",
  unmapped_student: "Unmapped",
  attendance_unmatched_email: "Attendance email",
};

export function DataIssuesTab({ issues }: { issues: DataIssueRow[] }) {
  const resolve = useResolveDataIssue();
  if (issues.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Nothing to fix. The sheet and Qwasar agree.
      </p>
    );
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Kind</TableHead>
            <TableHead>What the run found</TableHead>
            <TableHead>Suggested fix</TableHead>
            <TableHead className="w-28 text-right">Done</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((i) => {
            const done = !!i.resolved_at;
            return (
              <TableRow key={i.id} className={done ? "opacity-60" : undefined}>
                <TableCell>
                  <Badge variant="outline">
                    {KIND_LABEL[i.kind] ?? i.kind}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{i.detail}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {i.suggested_fix ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={done ? "ghost" : "outline"}
                    disabled={resolve.isPending}
                    onClick={() =>
                      resolve.mutate({ id: i.id, resolved: !done })
                    }
                  >
                    {done ? "Reopen" : "Mark fixed"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
