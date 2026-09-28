/**
 * Unsent composer text, kept per thread in `sessionStorage` so minimizing
 * the widget or reloading the page never loses a half-written answer.
 * Every access is guarded: private windows and blocked storage must not
 * break the chat, they just lose the reload safety net.
 */
const PREFIX = "startie:draft:";

export function draftKey(threadId: string | null): string {
  return `${PREFIX}${threadId ?? "new"}`;
}

export function readDraft(threadId: string | null): string {
  try {
    return window.sessionStorage.getItem(draftKey(threadId)) ?? "";
  } catch {
    return "";
  }
}

export function writeDraft(threadId: string | null, text: string): void {
  try {
    const key = draftKey(threadId);
    if (text.length === 0) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, text);
  } catch {
    // Storage unavailable — the in-memory draft still works.
  }
}
