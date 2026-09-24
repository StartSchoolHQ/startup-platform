"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { createClient } from "@/lib/supabase/client";
import { relativeDate } from "@/lib/ai-review/admin-ui";
import type { Database } from "@/types/database";
import { InboxFilter } from "./inbox-filter";
import { StartieThreadSheet } from "./startie-thread-sheet";

export type StartieThreadRow =
  Database["public"]["Functions"]["get_assistant_admin_threads_v1"]["Returns"][number];

type Filter = "all" | "flagged";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "flagged", label: "Flagged" },
];
const ALL_STUDENTS = "__all__";

export function StartieThreadsTable() {
  const [filter, setFilter] = useState<Filter>("all");
  const [student, setStudent] = useState<string>(ALL_STUDENTS);
  const [selected, setSelected] = useState<StartieThreadRow | null>(null);

  const {
    data: threads = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "assistant", "threads", filter],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<StartieThreadRow[]> => {
      const { data, error } = await createClient().rpc(
        "get_assistant_admin_threads_v1",
        {
          p_flagged_only: filter === "flagged",
          p_user_id: null as unknown as string,
          p_limit: 200,
          p_offset: 0,
        }
      );
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const students = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of threads) map.set(t.user_id, t.student_name ?? "Unknown");
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [threads]);

  const visible =
    student === ALL_STUDENTS
      ? threads
      : threads.filter((t) => t.user_id === student);

  if (isLoading) return <TableSkeleton rows={5} columns={6} />;
  if (isError) {
    return (
      <p className="text-destructive text-sm">
        Couldn&apos;t load conversations. Refresh the page.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-muted-foreground text-sm">
          {visible.length}{" "}
          {visible.length === 1 ? "conversation" : "conversations"}
        </div>
        <div className="flex items-center gap-2">
          <Select value={student} onValueChange={setStudent}>
            <SelectTrigger className="w-48" aria-label="Student">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STUDENTS}>All students</SelectItem>
              {students.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <InboxFilter options={FILTERS} value={filter} onChange={setFilter} />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No conversations yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="text-right">Msgs</TableHead>
              <TableHead className="text-right">Flags</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Last active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((t) => (
              <TableRow
                key={t.id}
                className="cursor-pointer"
                onClick={() => setSelected(t)}
              >
                <TableCell className="font-medium">
                  {t.student_name ?? "Unknown"}
                </TableCell>
                <TableCell className="max-w-xs truncate">{t.title}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.message_count}
                </TableCell>
                <TableCell className="text-right">
                  {Number(t.flagged_count) > 0 ? (
                    <Badge variant="outline" className="gap-1 text-amber-700">
                      <Flag className="size-3" />
                      {t.flagged_count}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${Number(t.cost_usd).toFixed(3)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {relativeDate(t.updated_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <StartieThreadSheet
        key={selected?.id ?? "none"}
        thread={selected}
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
