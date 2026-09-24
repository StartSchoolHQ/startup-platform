"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { useAssistantSettings } from "@/hooks/use-assistant-settings";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { useStartieChat } from "@/hooks/use-startie-chat";
import type { AssistantSettings } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";
import { StartieButton } from "./startie-button";
import { StartieChat } from "./startie-chat";

/**
 * Mounted once in the dashboard shell. Renders nothing until the user, the
 * `assistant.enabled` switch and at least one journey are all on.
 */
export function StartieWidget() {
  const { user } = useApp();
  const { data: settings } = useAssistantSettings();
  const { data: journeys } = usePlatformSettings();

  if (!user || !settings.enabled) return null;
  if (!journeys.myJourney && !journeys.teamJourney) return null;

  return (
    <StartieWidgetInner
      userId={user.id}
      isAdmin={user.primary_role === "admin"}
      settings={settings}
    />
  );
}

function StartieWidgetInner({
  userId,
  isAdmin,
  settings,
}: {
  userId: string;
  isAdmin: boolean;
  settings: AssistantSettings;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  // Read through a ref so the reply-finished callback sees the live value
  // even when the panel was closed after the send started.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const chat = useStartieChat({
    userId,
    isAdmin,
    dailyLimit: settings.dailyLimit,
    pathname,
    onReplyDone: () => {
      if (!openRef.current) setUnread(true);
    },
  });

  const openPanel = () => {
    setUnread(false);
    setOpen(true);
  };

  return (
    <>
      {!open && <StartieButton onClick={openPanel} unread={unread} />}
      {open && (
        <div
          role="dialog"
          aria-label="Startie, AI assistant"
          className={cn(
            // Popup card bottom-right on desktop; the page stays usable behind it.
            "bg-background fixed z-50 flex flex-col overflow-hidden",
            "inset-0 sm:inset-auto sm:right-4 sm:bottom-4",
            "sm:h-[min(640px,calc(100vh-2rem))] sm:w-[380px]",
            "sm:rounded-xl sm:border sm:shadow-2xl"
          )}
        >
          <StartieChat
            messages={chat.messages}
            threads={chat.threads}
            threadId={chat.threadId}
            remaining={chat.remaining}
            dailyLimit={settings.dailyLimit}
            isAdmin={isAdmin}
            streaming={chat.streaming}
            banner={chat.banner}
            onSend={chat.send}
            onFlag={chat.flag}
            onSelectThread={chat.selectThread}
            onNewThread={chat.newThread}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}
