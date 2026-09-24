"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { STARTIE_ICON_SRC } from "@/lib/assistant/icon";
import { formatResetTime, nextUtcMidnight } from "@/lib/assistant/limits";
import type { ChatMessage, ThreadSummary } from "@/types/assistant";
import { StartieComposer } from "./startie-composer";
import { StartieMessages } from "./startie-messages";
import { StartieThreads } from "./startie-threads";

export interface StartieChatProps {
  messages: ChatMessage[];
  threads: ThreadSummary[];
  threadId: string | null;
  /** null = unlimited (admins). */
  remaining: number | null;
  dailyLimit: number;
  isAdmin: boolean;
  streaming: boolean;
  banner: string | null;
  onSend: (content: string) => void;
  onFlag: (messageId: string) => void;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  onClose: () => void;
}

/** Presentational chat body: header, transcript, composer. No data fetching. */
export function StartieChat(props: StartieChatProps) {
  const outOfMessages = !props.isAdmin && props.remaining === 0;

  return (
    <div className="bg-background flex h-full min-h-0 flex-col">
      <header className="bg-primary text-primary-foreground flex items-center gap-2 px-3 py-2.5">
        <Image
          src={STARTIE_ICON_SRC}
          alt=""
          width={28}
          height={28}
          style={{ imageRendering: "pixelated" }}
        />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-sm font-semibold">
            Startie{" "}
            <span className="font-normal opacity-80">· AI assistant</span>
          </div>
          <Counter
            remaining={props.remaining}
            dailyLimit={props.dailyLimit}
            isAdmin={props.isAdmin}
          />
        </div>
        <StartieThreads
          threads={props.threads}
          threadId={props.threadId}
          onSelectThread={props.onSelectThread}
          onNewThread={props.onNewThread}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hover:bg-primary-foreground/15 hover:text-primary-foreground size-8"
          aria-label="Close"
          onClick={props.onClose}
        >
          <X className="size-4" />
        </Button>
      </header>

      {props.banner && (
        <div className="border-b bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          {props.banner}
        </div>
      )}

      <StartieMessages messages={props.messages} onFlag={props.onFlag} />

      <StartieComposer
        disabled={outOfMessages}
        streaming={props.streaming}
        outOfMessages={outOfMessages}
        onSend={props.onSend}
      />
    </div>
  );
}

function Counter({
  remaining,
  dailyLimit,
  isAdmin,
}: {
  remaining: number | null;
  dailyLimit: number;
  isAdmin: boolean;
}) {
  if (isAdmin || remaining === null) {
    return <div className="text-xs opacity-80">unlimited</div>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-default text-xs opacity-80">
          {remaining} of {dailyLimit} left today
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Resets at {formatResetTime(nextUtcMidnight())}
      </TooltipContent>
    </Tooltip>
  );
}
