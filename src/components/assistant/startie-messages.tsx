"use client";

import { useEffect, useRef } from "react";
import { ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskMarkdown } from "@/components/tasks/task-markdown";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/assistant";

interface Props {
  messages: ChatMessage[];
  onFlag: (messageId: string) => void;
}

export const DISCLOSURE =
  "I'm an AI. I can explain the platform, your progress, and think through tasks with you. I won't write your submissions. Admins can read these chats.";

export function StartieMessages({ messages, onFlag }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    // Optional call: jsdom (tests) has no scrollIntoView.
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length, lastContent]);

  return (
    <ScrollArea className="flex-1 px-3">
      <div className="flex flex-col gap-3 py-3">
        {messages.length === 0 && (
          <p className="text-muted-foreground bg-muted/50 rounded-md px-3 py-2 text-xs leading-relaxed">
            {DISCLOSURE}
          </p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} message={m} onFlag={onFlag} />
        ))}
        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}

function Bubble({
  message,
  onFlag,
}: {
  message: ChatMessage;
  onFlag: (id: string) => void;
}) {
  const isUser = message.role === "user";
  const persisted = !message.pending && !message.id.startsWith("pending-");
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground whitespace-pre-wrap"
            : "bg-muted"
        )}
      >
        {isUser ? (
          message.content
        ) : message.content ? (
          <TaskMarkdown>{message.content}</TaskMarkdown>
        ) : (
          <span className="text-muted-foreground animate-pulse">…</span>
        )}
        {!isUser && persisted && (
          <div className="mt-1 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-6"
              aria-label="Not helpful"
              title="Not helpful — flag for an admin"
              onClick={() => onFlag(message.id)}
            >
              <ThumbsDown className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
