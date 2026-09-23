"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  formatFileSize,
  SUPPORT_ATTACHMENTS_BUCKET,
} from "@/lib/support/attachment-rules";
import { useAppContext } from "@/contexts/app-context";
import type { SupportTicketRow, TicketStatus } from "@/types/support-inbox";

interface Props {
  ticket: SupportTicketRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailSheet({ ticket, open, onOpenChange }: Props) {
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  // The sheet is remounted (key={ticket.id}) whenever the selected ticket
  // changes, so this initial value is all the sync we need.
  const [note, setNote] = useState(ticket?.admin_note ?? "");

  // Signed URLs live 10 minutes; the admin storage policy allows the read.
  const links = useQuery({
    queryKey: ["admin", "inbox", "ticket-links", ticket?.id],
    enabled: open && !!ticket && ticket.attachments.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(SUPPORT_ATTACHMENTS_BUCKET)
        .createSignedUrls(
          ticket!.attachments.map((a) => a.path),
          600
        );
      if (error) throw error;
      return new Map(data.map((d) => [d.path ?? "", d.signedUrl]));
    },
  });

  const save = useMutation({
    retry: 0,
    mutationFn: async (status: TicketStatus) => {
      const supabase = createClient();
      // "Save note" replays the ticket's current status, so only stamp
      // resolved_at/resolved_by_user_id when this call actually resolves it;
      // leave them untouched on a note-only save, clear them on reopen.
      const resolving = ticket!.status !== "resolved" && status === "resolved";
      const reopening = ticket!.status === "resolved" && status === "open";
      const { error } = await supabase
        .from("support_tickets")
        .update({
          status,
          admin_note: note.trim() || null,
          updated_at: new Date().toISOString(),
          ...(resolving && {
            resolved_at: new Date().toISOString(),
            resolved_by_user_id: user?.id ?? null,
          }),
          ...(reopening && { resolved_at: null, resolved_by_user_id: null }),
        })
        .eq("id", ticket!.id);
      if (error) throw error;
      return { resolving, reopening };
    },
    onSuccess: ({ resolving, reopening }) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "inbox", "tickets"],
      });
      toast.success(
        resolving
          ? "Ticket resolved"
          : reopening
            ? "Ticket reopened"
            : "Ticket saved"
      );
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't update the ticket. Try again."),
  });

  if (!ticket) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{ticket.title}</SheetTitle>
          <SheetDescription>
            {ticket.users?.name ?? "Unknown"} · {ticket.users?.email} ·{" "}
            {format(new Date(ticket.created_at), "d MMM yyyy, HH:mm")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <div className="text-muted-foreground flex flex-wrap gap-x-4 text-xs">
            <span>Priority: {ticket.priority}</span>
            <span>Category: {ticket.category}</span>
            <span>Status: {ticket.status}</span>
          </div>

          <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>

          {ticket.attachments.length > 0 && (
            <div className="space-y-2">
              <Label>Attachments</Label>
              <ul className="space-y-1">
                {ticket.attachments.map((a) => (
                  <li key={a.path} className="flex items-center gap-2 text-sm">
                    <Download className="text-muted-foreground h-3.5 w-3.5" />
                    {links.data?.get(a.path) ? (
                      <a
                        href={links.data.get(a.path)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {a.name}
                      </a>
                    ) : (
                      <span>{a.name}</span>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {formatFileSize(a.size)}
                    </span>
                  </li>
                ))}
              </ul>
              {links.isError && (
                <p className="text-destructive text-xs">
                  Couldn&apos;t create download links.
                </p>
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="admin-note">Admin note</Label>
            <Textarea
              id="admin-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="What you did about it (only admins see this)."
              disabled={save.isPending}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={save.isPending}
              onClick={() => save.mutate(ticket.status)}
            >
              Save note
            </Button>
            {ticket.status === "open" ? (
              <Button
                disabled={save.isPending}
                onClick={() => save.mutate("resolved")}
              >
                {save.isPending ? "Saving…" : "Mark resolved"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={save.isPending}
                onClick={() => save.mutate("open")}
              >
                Reopen
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
