"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TeamDetailsModal } from "./team-details-modal";

interface Team {
  id: string;
  name: string;
  status: string;
  created_at: string;
  total_points: number;
  member_count: number;
  meetings_count: number;
  tasks_completed: number;
}

type SortKey =
  | "name"
  | "member_count"
  | "total_points"
  | "meetings_count"
  | "tasks_completed"
  | "created_at";
type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <TableHead
      className="hover:bg-muted/50 cursor-pointer select-none"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="text-muted-foreground/50 h-3.5 w-3.5" />
        )}
      </div>
    </TableHead>
  );
}

export function AdminTeamsTable() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>("total_points");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/admin/teams")
      .then((res) => res.json())
      .then((data) => {
        setTeams(data.teams || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey]
  );

  const sortedTeams = useMemo(() => {
    if (!sortKey) return teams;
    return [...teams].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (sortKey === "name" || sortKey === "created_at") {
        const aStr = (aVal as string) || "";
        const bStr = (bVal as string) || "";
        return sortDir === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [teams, sortKey, sortDir]);

  return (
    <>
      <TeamDetailsModal
        teamId={selectedTeamId}
        onClose={() => setSelectedTeamId(null)}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                label="Team Name"
                sortKey="name"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Members"
                sortKey="member_count"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Points"
                sortKey="total_points"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Meetings"
                sortKey="meetings_count"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Tasks Done"
                sortKey="tasks_completed"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <TableHead>Status</TableHead>
              <SortableHeader
                label="Created"
                sortKey="created_at"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : sortedTeams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No teams found
                </TableCell>
              </TableRow>
            ) : (
              sortedTeams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {team.member_count}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {team.total_points.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {team.meetings_count}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {team.tasks_completed}
                  </TableCell>
                  <TableCell>
                    {team.status === "active" ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">{team.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(team.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
