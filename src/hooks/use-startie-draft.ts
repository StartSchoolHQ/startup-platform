"use client";

import { useCallback, useEffect, useState } from "react";
import { readDraft, writeDraft } from "@/lib/assistant/draft";

/**
 * The composer's unsent text, owned by the always-mounted widget (not the
 * panel) so it survives minimize, and mirrored to sessionStorage so it also
 * survives a reload. One draft per thread; switching threads swaps drafts.
 */
export function useStartieDraft(threadId: string | null) {
  const [draft, setDraftState] = useState("");

  // Loaded in an effect, not the initializer: the widget is server-rendered
  // and sessionStorage only exists in the browser.
  useEffect(() => {
    setDraftState(readDraft(threadId));
  }, [threadId]);

  const setDraft = useCallback(
    (text: string) => {
      setDraftState(text);
      writeDraft(threadId, text);
    },
    [threadId]
  );

  return { draft, setDraft };
}
