/**
 * Unsent composer text, kept per thread in `sessionStorage` so minimizing
 * the widget or reloading the page never loses a half-written answer.
 * Every access is guarded: private windows and blocked storage must not
 * break the chat, they just lose the reload safety net — the in-memory
 * copy still carries the draft for the lifetime of the page.
 *
 * Exposed as a tiny external store (subscribe + read) so the hook can use
 * `useSyncExternalStore` instead of mirroring storage into React state.
 */
const PREFIX = "startie:draft:";

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

export function draftKey(threadId: string | null): string {
  return `${PREFIX}${threadId ?? "new"}`;
}

export function readDraft(threadId: string | null): string {
  const key = draftKey(threadId);
  try {
    // Storage is the source of truth (it survives a reload); the in-memory
    // copy only covers the case where storage is blocked.
    return window.sessionStorage.getItem(key) ?? "";
  } catch {
    return memory.get(key) ?? "";
  }
}

export function writeDraft(threadId: string | null, text: string): void {
  const key = draftKey(threadId);
  memory.set(key, text);
  try {
    if (text.length === 0) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, text);
  } catch {
    // Storage unavailable — the in-memory draft still works.
  }
  for (const listener of listeners) listener();
}

export function subscribeDrafts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
