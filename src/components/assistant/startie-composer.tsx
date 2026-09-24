"use client";

import { useState, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatResetTime, nextUtcMidnight } from "@/lib/assistant/limits";

interface Props {
  disabled: boolean;
  streaming: boolean;
  outOfMessages: boolean;
  onSend: (content: string) => void;
}

const MAX = 2000;

export function StartieComposer({
  disabled,
  streaming,
  outOfMessages,
  onSend,
}: Props) {
  const [draft, setDraft] = useState("");
  const trimmed = draft.trim();
  const canSend = !disabled && !streaming && trimmed.length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(trimmed.slice(0, MAX));
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const placeholder = outOfMessages
    ? `Out of messages — resets at ${formatResetTime(nextUtcMidnight())}`
    : "Ask Startie…";

  return (
    <div className="border-t p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX))}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="max-h-32 min-h-10 resize-none"
          aria-label="Message Startie"
        />
        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send"
        >
          <SendHorizontal className="size-4" />
        </Button>
      </div>
      <p className="text-muted-foreground mt-1.5 text-[11px]">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
}
