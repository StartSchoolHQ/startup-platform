"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAnalyticsStudents } from "./use-analytics";
import { ScoreBadge, TabError, TabSkeleton, TrendIcon } from "./shared";
import { Sparkline } from "./sparkline";
import { StudentDetailDialog } from "./student-detail-dialog";
import { formatWeek, toNum } from "./types";
import type { StudentRow } from "./types";

type SortKey = "name" | "latest" | "avg" | "trend" | "weeks";

export function StudentsTab({ active }: { active: boolean }) {
  const { data, isLoading, isError, refetch } = useAnalyticsStudents(active);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("trend");
  const [selected, setSelected] = useState<StudentRow | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const withTrend = data.map((s) => ({
      ...s,
      trendValue:
        toNum(s.recent_avg) != null && toNum(s.prior_avg) != null
          ? toNum(s.recent_avg)! - toNum(s.prior_avg)!
          : null,
    }));
    const q = search.trim().toLowerCase();
    const filtered = q
      ? withTrend.filter(
          (s) =>
            (s.user_name ?? "").toLowerCase().includes(q) ||
            (s.team_name ?? "").toLowerCase().includes(q)
        )
      : withTrend;
    const sorters: Record<
      SortKey,
      (a: (typeof filtered)[0], b: (typeof filtered)[0]) => number
    > = {
      name: (a, b) => (a.user_name ?? "").localeCompare(b.user_name ?? ""),
      latest: (a, b) => (a.latest_score ?? 99) - (b.latest_score ?? 99),
      avg: (a, b) => (toNum(a.avg_score) ?? 99) - (toNum(b.avg_score) ?? 99),
      trend: (a, b) => (a.trendValue ?? 99) - (b.trendValue ?? 99),
      weeks: (a, b) => a.weeks_submitted - b.weeks_submitted,
    };
    return [...filtered].sort(sorters[sortKey]);
  }, [data, search, sortKey]);

  if (isLoading) return <TabSkeleton />;
  if (isError) {
    return (
      <TabError
        message="Could not load student analytics."
        onRetry={() => refetch()}
      />
    );
  }

  const header = (label: string, key: SortKey) => (
    <button
      className={`hover:text-foreground ${sortKey === key ? "text-foreground font-semibold" : ""}`}
      onClick={() => setSortKey(key)}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search student or team…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <p className="text-muted-foreground text-sm">
          {rows.length} students · sorted by {sortKey}, worst first. Click a row
          for their timeline and comments.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{header("Student", "name")}</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>{header("Latest", "latest")}</TableHead>
                <TableHead>{header("Avg", "avg")}</TableHead>
                <TableHead>{header("Trend", "trend")}</TableHead>
                <TableHead className="w-36">Sentiment history</TableHead>
                <TableHead>{header("Weeks", "weeks")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow
                  key={s.user_id}
                  className="cursor-pointer"
                  onClick={() => setSelected(s)}
                >
                  <TableCell className="font-medium">
                    {s.user_name ?? "Unknown"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.team_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <ScoreBadge score={s.latest_score} />
                  </TableCell>
                  <TableCell>{toNum(s.avg_score)?.toFixed(1) ?? "—"}</TableCell>
                  <TableCell>
                    <TrendIcon delta={s.trendValue} />
                  </TableCell>
                  <TableCell>
                    <Sparkline
                      points={(s.scores ?? []).map((p) => ({
                        label: formatWeek(p.week),
                        value: p.score,
                      }))}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.weeks_submitted}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <StudentDetailDialog
        student={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
