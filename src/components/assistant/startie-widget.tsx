"use client";

import { track } from "@/lib/analytics/events";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { useAssistantSettings } from "@/hooks/use-assistant-settings";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { useStartieChat } from "@/hooks/use-startie-chat";
import { useStartieDraft } from "@/hooks/use-startie-draft";
import type { AssistantSettings } from "@/lib/assistant/types";
import { cn } from "@/lib/utils";
import { StartieButton } from "./startie-button";
import { StartieChat } from "./startie-chat";

const MINIMIZE_MS = 150;

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
  // True while the minimize animation plays; the panel unmounts after it.
  const [closing, setClosing] = useState(false);
  const [unread, setUnread] = useState(false);
  // Read through a ref so the reply-finished callback sees the live value
  // even when the panel was closed after the send started.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const minimize = useCallback(() => {
    if (!openRef.current || closing) return;
    setClosing(true);
    // Matches the animate-out duration below; a timer rather than
    // onAnimationEnd so reduced-motion (no animation event) still closes.
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, MINIMIZE_MS);
  }, [closing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") minimize();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, minimize]);

  const chat = useStartieChat({
    userId,
    isAdmin,
    dailyLimit: settings.dailyLimit,
    pathname,
    onReplyDone: () => {
      if (!openRef.current) setUnread(true);
    },
  });

  // Owned here, not in the composer: the panel unmounts on minimize and
  // colleagues lost half-written answers when they closed it to look
  // something up on the page.
  const { draft, setDraft } = useStartieDraft(chat.threadId);

  const openPanel = () => {
    setUnread(false);
    setOpen(true);
    track("startie_opened", { page: pathname });
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
            // Minimize (header button or Escape) hides it without losing anything.
            "bg-background fixed z-50 flex flex-col overflow-hidden",
            "inset-0 sm:inset-auto sm:right-4 sm:bottom-4",
            "sm:h-[min(640px,calc(100vh-2rem))] sm:w-[380px]",
            "sm:rounded-xl sm:border sm:shadow-2xl",
            // Grows out of / shrinks back into the face button's corner.
            "origin-bottom-right duration-150 motion-reduce:animate-none",
            closing
              ? "animate-out fade-out-0 zoom-out-95 slide-out-to-bottom-2 fill-mode-forwards"
              : "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
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
            onMinimize={minimize}
            draft={draft}
            onDraftChange={setDraft}
          />
        </div>
      )}
    </>
  );
}
