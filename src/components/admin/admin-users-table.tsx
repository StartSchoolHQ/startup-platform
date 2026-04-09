"use client";

import { UserDetailModal } from "@/components/admin/user-detail-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
  status: string;
  primary_role: string;
  created_at: string;
  last_sign_in_at: string | null;
  total_xp: number;
  total_points: number;
}

type SortKey =
  | "name"
  | "total_xp"
  | "total_points"
  | "created_at"
  | "last_sign_in_at";
type SortDir = "asc" | "desc";

function relativeDate(date: string | null): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentSort === sortKey;
  return (
    <TableHead
      className={cn("hover:bg-muted/50 cursor-pointer select-none", className)}
      onClick={() => onSort(sortKey)}
    >
      <div
        className={cn(
          "flex items-center gap-1",
          className?.includes("text-right") && "justify-end"
        )}
      >
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

export function AdminUsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const limit = 50;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      filter,
    });

    fetch(`/api/admin/users?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, search, filter]);

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

  const sortedUsers = useMemo(() => {
    if (!sortKey) return users;
    return [...users].sort((a, b) => {
      let aVal: string | number | null = a[sortKey];
      let bVal: string | number | null = b[sortKey];

      // Handle nulls
      if (aVal === null || aVal === undefined)
        aVal = sortDir === "asc" ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined)
        bVal = sortDir === "asc" ? Infinity : -Infinity;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      // Dates as strings
      if (sortKey === "created_at" || sortKey === "last_sign_in_at") {
        const aTime =
          typeof aVal === "string"
            ? new Date(aVal).getTime()
            : (aVal as number);
        const bTime =
          typeof bVal === "string"
            ? new Date(bVal).getTime()
            : (bVal as number);
        return sortDir === "asc" ? aTime - bTime : bTime - aTime;
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [users, sortKey, sortDir]);

  const [now] = useState(() => Date.now());

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={filter}
          onValueChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="admins">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                label="Name"
                sortKey="name"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <SortableHeader
                label="XP"
                sortKey="total_xp"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Points"
                sortKey="total_points"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <SortableHeader
                label="Joined"
                sortKey="created_at"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Last Login"
                sortKey="last_sign_in_at"
                currentSort={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
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
            ) : sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((user) => {
                const daysSinceLogin = user.last_sign_in_at
                  ? Math.floor(
                      (now - new Date(user.last_sign_in_at).getTime()) /
                        86400000
                    )
                  : null;
                const isInactive =
                  daysSinceLogin === null || daysSinceLogin > 14;

                return (
                  <TableRow
                    key={user.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() =>
                      setSelectedUser({
                        id: user.id,
                        name: user.name || user.email,
                      })
                    }
                  >
                    <TableCell className="font-medium">
                      {user.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {user.status === "active" ? (
                        <Badge variant="default">Active</Badge>
                      ) : user.status === "pending" ? (
                        <Badge variant="secondary">Pending</Badge>
                      ) : (
                        <Badge variant="outline">Archived</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.primary_role === "admin" ? (
                        <Badge variant="destructive">Admin</Badge>
                      ) : (
                        <span className="text-sm">User</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.total_xp?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.total_points?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {relativeDate(user.created_at)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm",
                          isInactive
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {relativeDate(user.last_sign_in_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {users.length} of {total} users
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <UserDetailModal
        userId={selectedUser?.id || null}
        userName={selectedUser?.name || ""}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      />
    </div>
  );
}
