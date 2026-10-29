"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DraftSaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseAutosaveDraftOptions<T> {
  /** Only save while true (modal open AND the restore fetch has settled). */
  enabled: boolean;
  value: T;
  /** False = skip this write (e.g. empty form with no existing row). */
  canSave: (value: T) => boolean;
  /** Debounced path. Throw to land in "error". */
  save: (value: T) => Promise<void>;
  /** Keepalive path for pagehide / unmount. Must not await anything. */
  beacon?: (value: T) => void;
  delayMs?: number; // default 2000
}

export interface UseAutosaveDraftResult {
  status: DraftSaveStatus;
  savedAt: Date | null;
  /** Cancel the timer and save the latest value now (modal close). */
  flush: () => Promise<void>;
  /** Cancel the timer and drop the dirty flag (before submit). */
  cancel: () => void;
  /** Map an error message for the indicator (optional override). */
  errorMessage: string | null;
}

type TimerRef = { current: ReturnType<typeof setTimeout> | null };

function clearTimer(ref: TimerRef) {
  if (ref.current !== null) clearTimeout(ref.current);
  ref.current = null;
}

const SAVED_TO_IDLE_MS = 3000;

/**
 * Debounced draft autosave. Saves the latest value `delayMs` after the last
 * change; a change during an in-flight save queues exactly one more save.
 * Leaving the page (pagehide, tab hidden, unmount) fires `beacon` once.
 * Disabling (`enabled` → false) fires `beacon` once if dirty, as a backstop
 * for closes that bypass `flush()`, then drops the dirty and queued flags so
 * nothing carries into the next enabled session, and resets the indicator
 * (`status` idle, `errorMessage` null).
 */
export function useAutosaveDraft<T>({
  enabled,
  value,
  canSave,
  save,
  beacon,
  delayMs = 2000,
}: UseAutosaveDraftOptions<T>): UseAutosaveDraftResult {
  const [status, setStatus] = useState<DraftSaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Disabling resets the indicator so a failed save never shows on the next
  // open. Adjust-state-during-render, not an effect.
  const [wasEnabled, setWasEnabled] = useState(enabled);
  if (enabled !== wasEnabled) {
    setWasEnabled(enabled);
    if (!enabled) {
      setStatus("idle");
      setErrorMessage(null);
    }
  }

  const valueRef = useRef(value);
  const canSaveRef = useRef(canSave);
  const saveRef = useRef(save);
  const beaconRef = useRef(beacon);
  const enabledRef = useRef(enabled);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const dirtyRef = useRef(false);
  const queuedRef = useRef(false);
  const baselineRef = useRef<{ value: T } | null>(null);

  useEffect(() => {
    valueRef.current = value;
    canSaveRef.current = canSave;
    saveRef.current = save;
    beaconRef.current = beacon;
    enabledRef.current = enabled;
  });

  const drain = useCallback((): Promise<void> => {
    if (inFlightRef.current) {
      queuedRef.current = true;
      return inFlightRef.current;
    }
    if (!dirtyRef.current) return Promise.resolve();
    const run = async () => {
      do {
        queuedRef.current = false;
        if (!dirtyRef.current || !enabledRef.current) break;
        const latest = valueRef.current;
        if (!canSaveRef.current(latest)) break;
        dirtyRef.current = false;
        clearTimer(idleTimerRef);
        setStatus("saving");
        try {
          await saveRef.current(latest);
          setSavedAt(new Date());
          setErrorMessage(null);
          setStatus("saved");
          idleTimerRef.current = setTimeout(() => {
            idleTimerRef.current = null;
            setStatus("idle");
          }, SAVED_TO_IDLE_MS);
        } catch (err) {
          dirtyRef.current = true; // still unsaved: flush/beacon may retry
          setErrorMessage(err instanceof Error ? err.message : null);
          setStatus("error");
        }
      } while (queuedRef.current);
    };
    const promise = run().finally(() => {
      inFlightRef.current = null;
    });
    inFlightRef.current = promise;
    return promise;
  }, []);

  // Mark dirty and (re)start the debounce on every change while enabled.
  // The first value seen after enabling is the baseline, not a change.
  useEffect(() => {
    if (!enabled) {
      // Runs after the listener effect's cleanup, so its beacon goes first.
      baselineRef.current = null;
      dirtyRef.current = false;
      queuedRef.current = false;
      clearTimer(timerRef);
      clearTimer(idleTimerRef);
      return;
    }
    if (baselineRef.current === null) {
      baselineRef.current = { value };
      return;
    }
    if (Object.is(baselineRef.current.value, value)) return;
    baselineRef.current.value = value;
    dirtyRef.current = true;
    if (inFlightRef.current) queuedRef.current = true;
    clearTimer(timerRef);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void drain();
    }, delayMs);
  }, [value, enabled, delayMs, drain]);

  // Leave-flush: pagehide, tab hidden, and unmount / disable fire the beacon.
  useEffect(() => {
    if (!enabled) return;
    const fireBeacon = () => {
      const send = beaconRef.current;
      const latest = valueRef.current;
      if (!send || !dirtyRef.current || !canSaveRef.current(latest)) return;
      dirtyRef.current = false;
      clearTimer(timerRef);
      send(latest);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") fireBeacon();
    };
    window.addEventListener("pagehide", fireBeacon);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", fireBeacon);
      document.removeEventListener("visibilitychange", onVisibility);
      fireBeacon();
    };
  }, [enabled]);

  useEffect(
    () => () => {
      clearTimer(timerRef);
      clearTimer(idleTimerRef);
    },
    []
  );

  const flush = useCallback(() => {
    clearTimer(timerRef);
    return drain();
  }, [drain]);

  const cancel = useCallback(() => {
    clearTimer(timerRef);
    dirtyRef.current = false;
    queuedRef.current = false;
  }, []);

  return { status, savedAt, flush, cancel, errorMessage };
}
