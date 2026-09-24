"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { useAssistantSettings } from "@/hooks/use-assistant-settings";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { useStartieChat } from "@/hooks/use-startie-chat";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { AssistantSettings } from "@/lib/assistant/types";
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

  const onReplyDone = useCallback(() => {
    setUnread((prev) => prev || !open);
  }, [open]);

  const chat = useStartieChat({
    userId,
    isAdmin,
    dailyLimit: settings.dailyLimit,
    pathname,
    onReplyDone,
  });

  const openPanel = () => {
    setUnread(false);
    setOpen(true);
  };

  return (
    <>
      {!open && <StartieButton onClick={openPanel} unread={unread} />}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[380px]"
        >
          <SheetTitle className="sr-only">Startie, AI assistant</SheetTitle>
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
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
