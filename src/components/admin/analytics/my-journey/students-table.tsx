"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ScoreBadge } from "../shared";
import type { MyJourneyData } from "../types";

type Student = MyJourneyData["students"][number];
type SortKey =
  | "highest_phase"
  | "completed"
  | "last_active"
  | "mean_attempts"
  | "sentiment";

interface Props {
  students: Student[];
}

export function StudentsTable({ students }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "highest_phase",
    dir: -1,
  });

  const rows = useMemo(() => {
    const val = (s: Student, k: SortKey): number =>
      k === "last_active"
        ? s.last_active
          ? new Date(s.last_active).getTime()
          : 0
        : Number(s[k] ?? -1);
    return [...students].sort(
      (a, b) => (val(a, sort.key) - val(b, sort.key)) * sort.dir
    );
  }, [students, sort]);

  const header = (label: string, key: SortKey) => (
    <TableHead>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 h-7 gap-1 px-2"
        onClick={() =>
          setSort((s) => ({
            key,
            dir: s.key === key ? ((s.dir * -1) as 1 | -1) : -1,
          }))
        }
      >
        {label}
        <ArrowUpDown className="size-3" />
      </Button>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Students</CardTitle>
        <CardDescription>
          One row per student in the cohort. Click a column to sort.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No students in this cohort yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                {header("Phase", "highest_phase")}
                {header("Done", "completed")}
                {header("Last active", "last_active")}
                {header("Attempts", "mean_attempts")}
                {header("Sentiment", "sentiment")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.user_id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="tabular-nums">
                    {s.highest_phase}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {s.completed} / {s.total}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.last_active
                      ? `${formatDistanceToNow(new Date(s.last_active))} ago`
                      : "never"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {s.mean_attempts ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={s.sentiment} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
