"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readDraft, subscribeDrafts, writeDraft } from "@/lib/assistant/draft";

const getServerSnapshot = () => "";

/**
 * The composer's unsent text, owned by the always-mounted widget (not the
 * panel) so it survives minimize, and mirrored to sessionStorage so it also
 * survives a reload. One draft per thread; switching threads swaps drafts.
 *
 * Read through `useSyncExternalStore`: the widget is server-rendered and
 * sessionStorage only exists in the browser, so the server snapshot is
 * empty and the stored draft appears right after hydration.
 */
export function useStartieDraft(threadId: string | null) {
  const draft = useSyncExternalStore(
    subscribeDrafts,
    () => readDraft(threadId),
    getServerSnapshot
  );

  const setDraft = useCallback(
    (text: string) => writeDraft(threadId, text),
    [threadId]
  );

  return { draft, setDraft };
}
