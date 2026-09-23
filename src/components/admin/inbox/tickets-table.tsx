"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import type { SupportTicketRow, TicketStatus } from "@/types/support-inbox";
import { InboxFilter } from "./inbox-filter";
import { TicketDetailSheet } from "./ticket-detail-sheet";

type Filter = TicketStatus | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

const PRIORITY_CLASS: Record<SupportTicketRow["priority"], string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export function TicketsTable() {
  const [filter, setFilter] = useState<Filter>("open");
  const [selected, setSelected] = useState<SupportTicketRow | null>(null);

  const {
    data: tickets = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "inbox", "tickets", filter],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("support_tickets")
        .select("*, users!user_id(name, email)")
        .order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as SupportTicketRow[];
    },
  });

  if (isLoading) return <TableSkeleton rows={5} columns={5} />;
  if (isError)
    return (
      <p className="text-destructive text-sm">
        Couldn&apos;t load tickets. Refresh the page.
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
        </div>
        <InboxFilter options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {tickets.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Nothing here.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow
                key={ticket.id}
                className="cursor-pointer"
                onClick={() => setSelected(ticket)}
              >
                <TableCell className="max-w-[320px]">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{ticket.title}</span>
                    {ticket.attachments.length > 0 && (
                      <Paperclip className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    )}
                  </div>
                  {ticket.status === "resolved" && (
                    <Badge variant="outline" className="mt-1 font-normal">
                      Resolved
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  <div>{ticket.users?.name ?? "—"}</div>
                  <div className="text-muted-foreground text-xs">
                    {ticket.users?.email}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{ticket.category}</TableCell>
                <TableCell>
                  <Badge className={PRIORITY_CLASS[ticket.priority]}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-xs">
                  {formatDistanceToNow(new Date(ticket.created_at), {
                    addSuffix: true,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TicketDetailSheet
        key={selected?.id ?? "none"}
        ticket={selected}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
