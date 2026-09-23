"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { createClient } from "@/lib/supabase/client";
import type {
  SuggestionStatus,
  TaskSuggestionRow,
} from "@/types/support-inbox";
import { InboxFilter } from "./inbox-filter";
import { SuggestionDecisionDialog } from "./suggestion-decision-dialog";

type Filter = SuggestionStatus | "all";
type Decision = Exclude<SuggestionStatus, "pending">;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "All" },
];

const STATUS_CLASS: Record<SuggestionStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-muted text-muted-foreground",
};

export function TaskSuggestionsTable() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [target, setTarget] = useState<{
    row: TaskSuggestionRow;
    decision: Decision;
  } | null>(null);

  const {
    data: rows = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "inbox", "task-suggestions", filter],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("task_suggestions")
        .select(
          "*, users!user_id(name, email), achievements!achievement_id(name)"
        )
        .order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as TaskSuggestionRow[];
    },
  });

  if (isLoading) return <TableSkeleton rows={5} columns={3} />;
  if (isError)
    return (
      <p className="text-destructive text-sm">
        Couldn&apos;t load suggestions. Refresh the page.
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {rows.length} {rows.length === 1 ? "suggestion" : "suggestions"}
        </div>
        <InboxFilter options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Nothing here.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.title}</span>
                    <Badge variant="outline" className="font-normal">
                      {row.achievements?.name ?? "Unknown phase"}
                    </Badge>
                    <Badge className={STATUS_CLASS[row.status]}>
                      {row.status}
                    </Badge>
                  </div>
                  <p className="text-sm">{row.description}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.users?.name ?? "Unknown"} · {row.users?.email} ·{" "}
                    {formatDistanceToNow(new Date(row.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                  {row.admin_note && (
                    <p className="text-muted-foreground text-xs italic">
                      Note: {row.admin_note}
                    </p>
                  )}
                </div>
                {row.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTarget({ row, decision: "declined" })}
                    >
                      <X className="h-4 w-4" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setTarget({ row, decision: "accepted" })}
                    >
                      <Check className="h-4 w-4" />
                      Accept
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <SuggestionDecisionDialog
        key={target ? `${target.row.id}:${target.decision}` : "none"}
        suggestion={target?.row ?? null}
        decision={target?.decision ?? "accepted"}
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
      />
    </div>
  );
}
