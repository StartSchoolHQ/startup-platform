"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminWeeklyReportViewModal,
  type AdminWeeklyReportRow,
} from "@/components/admin/admin-weekly-report-view-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";

interface FilterOption {
  id: string;
  label: string;
}

interface WeekOption {
  key: string;
  week_number: number;
  week_year: number;
  week_start_date: string;
  week_end_date: string;
}

const STATUS_OPTIONS = [
  { id: "all", label: "All statuses" },
  { id: "submitted", label: "Submitted" },
  { id: "draft", label: "Draft" },
];

function formatWeekLabel(w: WeekOption) {
  const start = new Date(w.week_start_date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const end = new Date(w.week_end_date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `Week ${w.week_number} · ${start}–${end} (${w.week_year})`;
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminWeeklyReportsTable() {
  const [reports, setReports] = useState<AdminWeeklyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 50;

  const [users, setUsers] = useState<FilterOption[]>([]);
  const [teams, setTeams] = useState<FilterOption[]>([]);
  const [weeks, setWeeks] = useState<WeekOption[]>([]);

  const [userId, setUserId] = useState<string>("all");
  const [teamId, setTeamId] = useState<string>("all");
  const [week, setWeek] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const [selectedReport, setSelectedReport] =
    useState<AdminWeeklyReportRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Load filter options once
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/weekly-reports/filters")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        type U = { id: string; name: string | null; email: string };
        type T = { id: string; name: string };
        const userOpts: FilterOption[] =
          (data.users as U[] | undefined)?.map((u) => ({
            id: u.id,
            label: u.name || u.email,
          })) || [];
        const teamOpts: FilterOption[] =
          (data.teams as T[] | undefined)?.map((t) => ({
            id: t.id,
            label: t.name,
          })) || [];
        setUsers(userOpts);
        setTeams(teamOpts);
        setWeeks(data.weeks || []);
      })
      .catch(() => {
        // Silent — filters are a nice-to-have; table still works
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load reports when filters/page change
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (userId !== "all") params.set("user_id", userId);
    if (teamId !== "all") params.set("team_id", teamId);
    if (week !== "all") params.set("week", week);
    if (status !== "all") params.set("status", status);

    fetch(`/api/admin/weekly-reports?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setReports(data.reports || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, userId, teamId, week, status]);

  // Reset page when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [userId, teamId, week, status]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasFilters =
    userId !== "all" || teamId !== "all" || week !== "all" || status !== "all";

  const weekByKey = useMemo(() => {
    const m = new Map<string, WeekOption>();
    for (const w of weeks) m.set(w.key, w);
    return m;
  }, [weeks]);

  const clearFilters = () => {
    setUserId("all");
    setTeamId("all");
    setWeek("all");
    setStatus("all");
  };

  const openReport = (r: AdminWeeklyReportRow) => {
    setSelectedReport(r);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={week} onValueChange={setWeek}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Week" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All weeks</SelectItem>
            {weeks.map((w) => (
              <SelectItem key={w.key} value={w.key}>
                {formatWeekLabel(w)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        <div className="text-muted-foreground ml-auto text-sm">
          {loading ? "Loading…" : `${total} report${total === 1 ? "" : "s"}`}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Week</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[160px]">Submitted</TableHead>
              <TableHead className="w-[80px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-8 w-14" />
                  </TableCell>
                </TableRow>
              ))
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  No weekly reports match these filters.
                </TableCell>
              </TableRow>
            ) : (
              reports.map((r) => {
                const key = `${r.week_year}-${String(r.week_number).padStart(
                  2,
                  "0"
                )}`;
                const w = weekByKey.get(key);
                return (
                  <TableRow
                    key={r.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => openReport(r)}
                  >
                    <TableCell>
                      <div className="font-medium">Week {r.week_number}</div>
                      <div className="text-muted-foreground text-xs">
                        {w ? `${formatDate(w.week_start_date)}` : r.week_year}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {r.user?.name || r.user?.email || "—"}
                      </div>
                      {r.user?.name && (
                        <div className="text-muted-foreground text-xs">
                          {r.user.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.team?.name || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.status === "submitted" ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Submitted
                        </Badge>
                      ) : r.status === "draft" ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Draft
                        </Badge>
                      ) : (
                        <Badge variant="outline">{r.status || "—"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(r.submitted_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReport(r);
                        }}
                        className="gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AdminWeeklyReportViewModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        report={selectedReport}
      />
    </div>
  );
}
