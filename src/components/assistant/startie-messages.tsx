"use client";

import Image from "next/image";
import { ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { TaskMarkdown } from "@/components/tasks/task-markdown";
import { STARTIE_ICON_SRC } from "@/lib/assistant/icon";
import type { ChatMessage } from "@/types/assistant";

interface Props {
  messages: ChatMessage[];
  onFlag: (messageId: string) => void;
}

export const DISCLOSURE =
  "I'm an AI. I can explain the platform, your progress, and think through tasks with you. I won't write your submissions. Admins can read these chats.";

/**
 * The transcript. shadcn's MessageScroller owns the scroll behaviour: it
 * anchors each new student turn near the top, follows streamed replies at
 * the live edge, and offers a jump-to-end button once the reader scrolls up.
 */
export function StartieMessages({ messages, onFlag }: Props) {
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className="flex-1">
        <MessageScrollerViewport className="px-3">
          <MessageScrollerContent className="gap-3 py-3">
            <MessageScrollerItem messageId="disclosure">
              <Marker variant="border" className="text-xs">
                <MarkerIcon>
                  <StartieFace size={16} />
                </MarkerIcon>
                <MarkerContent>{DISCLOSURE}</MarkerContent>
              </Marker>
            </MessageScrollerItem>
            {messages.map((m) => (
              <MessageScrollerItem
                key={m.id}
                messageId={m.id}
                scrollAnchor={m.role === "user"}
              >
                <Turn message={m} onFlag={onFlag} />
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        {/* `start-1/2` stands in for shadcn's `inset-s-1/2` utility, which
            lives in their tailwind.css bundle that this project does not load. */}
        <MessageScrollerButton className="start-1/2" />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function StartieFace({ size }: { size: number }) {
  return (
    <Image
      src={STARTIE_ICON_SRC}
      alt=""
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

function Turn({
  message,
  onFlag,
}: {
  message: ChatMessage;
  onFlag: (id: string) => void;
}) {
  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble align="end">
            <BubbleContent className="whitespace-pre-wrap">
              {message.content}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  const persisted = !message.pending && !message.id.startsWith("pending-");
  return (
    <Message align="start">
      <MessageAvatar className="bg-transparent">
        <StartieFace size={28} />
      </MessageAvatar>
      <MessageContent>
        <Bubble variant="muted">
          <BubbleContent>
            {message.pending && !message.content ? (
              <span className="text-muted-foreground animate-pulse">…</span>
            ) : (
              <TaskMarkdown>
                {message.content || "_(empty reply)_"}
              </TaskMarkdown>
            )}
          </BubbleContent>
        </Bubble>
        {persisted && (
          <MessageFooter className="px-1">
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
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}
