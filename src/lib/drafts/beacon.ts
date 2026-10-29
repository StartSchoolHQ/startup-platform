import type { DraftBeacon } from "@/lib/validation-schemas";

/** Fire-and-forget keepalive POST; swallows errors (the tab is dying). */
export function sendDraftBeacon(body: DraftBeacon): void {
  try {
    fetch("/api/drafts", {
      method: "POST",
      keepalive: true,
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => undefined);
  } catch {
    // fetch can throw synchronously (e.g. keepalive body over 64 KB).
  }
}
