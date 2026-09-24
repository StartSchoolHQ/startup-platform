"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Flag } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskMarkdown } from "@/components/tasks/task-markdown";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AssistantMessageRow } from "@/types/assistant";
import type { StartieThreadRow } from "./startie-threads-table";

interface Props {
  thread: StartieThreadRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Full transcript of one thread. Admin RLS on `assistant_messages` allows the read. */
export function StartieThreadSheet({ thread, open, onOpenChange }: Props) {
  const messages = useQuery({
    queryKey: ["admin", "assistant", "thread", thread?.id],
    enabled: open && !!thread,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<AssistantMessageRow[]> => {
      const { data, error } = await createClient()
        .from("assistant_messages")
        .select("*")
        .eq("thread_id", thread!.id)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (!thread) return null;

  const rows = messages.data ?? [];
  const flagged = new Set(
    rows
      .filter((m) => m.role === "system_note" && m.flagged_message_id)
      .map((m) => m.flagged_message_id as string)
  );
  const turns = rows.filter((m) => m.role !== "system_note");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pr-6">{thread.title}</SheetTitle>
          <SheetDescription>
            {thread.student_name ?? "Unknown"} ·{" "}
            {format(new Date(thread.created_at), "d MMM yyyy, HH:mm")} ·{" "}
            {thread.message_count} messages · $
            {Number(thread.cost_usd).toFixed(3)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-6">
          {messages.isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-3/4" />
            ))}
          {messages.isError && (
            <p className="text-destructive text-sm">
              Couldn&apos;t load this conversation.
            </p>
          )}
          {turns.map((m) => (
            <Turn key={m.id} message={m} flagged={flagged.has(m.id)} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Turn({
  message,
  flagged,
}: {
  message: AssistantMessageRow;
  flagged: boolean;
}) {
  const isUser = message.role === "user";
  const meta = isUser
    ? format(new Date(message.created_at), "HH:mm")
    : [
        message.model ?? "no model",
        message.input_tokens !== null
          ? `${message.input_tokens} in (${message.cached_tokens ?? 0} cached, ${message.cache_write_tokens ?? 0} written)`
          : null,
        message.output_tokens !== null ? `${message.output_tokens} out` : null,
        message.cost_usd !== null
          ? `$${Number(message.cost_usd).toFixed(4)}`
          : null,
        message.prompt_version,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
            : "bg-muted",
          flagged && "ring-2 ring-amber-500/60"
        )}
      >
        {isUser ? (
          message.content
        ) : (
          <TaskMarkdown>{message.content}</TaskMarkdown>
        )}
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[11px]",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
          title={meta}
        >
          {flagged && <Flag className="size-3 text-amber-600" />}
          {flagged && (
            <span className="text-amber-700">Flagged by student ·</span>
          )}
          <span className="truncate">{meta}</span>
        </div>
      </div>
    </div>
  );
}
