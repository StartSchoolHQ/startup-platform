"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CHANGELOG_LATEST } from "@/lib/changelog";

/**
 * The "What's new" dot in the sidebar and the hook that clears it.
 *
 * Last seen is a date string in localStorage, a per-browser convenience
 * only: with storage blocked the dot simply shows, and the page itself never
 * depends on it. The dot renders nothing on the server and on the first
 * client paint, so there is no hydration mismatch.
 */
const STORAGE_KEY = "whats-new-seen";
const EVENT = "whats-new-seen";

function readSeen(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Writes the newest entry date as seen and tells every open dot. */
export function markWhatsNewSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, CHANGELOG_LATEST);
  } catch {
    // Storage blocked: the dot stays, nothing else changes.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Small dot after the nav label while there is an unseen entry. */
export function WhatsNewDot() {
  const seen = useSyncExternalStore(
    subscribe,
    readSeen,
    () => CHANGELOG_LATEST // server: pretend seen, so nothing renders
  );
  if (seen >= CHANGELOG_LATEST) return null;
  return (
    <span
      aria-label="New updates"
      className="bg-primary ml-auto inline-block h-2 w-2 shrink-0 rounded-full"
    />
  );
}

/** Mount on the changelog page: clears the dot on visit. */
export function MarkWhatsNewSeen() {
  useEffect(() => {
    markWhatsNewSeen();
  }, []);
  return null;
}
