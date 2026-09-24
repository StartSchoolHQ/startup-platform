"use client";

import { History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ThreadSummary } from "@/types/assistant";

interface Props {
  threads: ThreadSummary[];
  threadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
}

export function StartieThreads({
  threads,
  threadId,
  onSelectThread,
  onNewThread,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Conversations"
        >
          <History className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={onNewThread}>
          <Plus className="size-4" />
          New chat
        </DropdownMenuItem>
        {threads.length > 0 && <DropdownMenuSeparator />}
        {threads.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => onSelectThread(t.id)}
            className={t.id === threadId ? "bg-accent" : undefined}
          >
            <span className="truncate">{t.title}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
