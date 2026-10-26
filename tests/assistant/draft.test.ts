// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  draftKey,
  readDraft,
  subscribeDrafts,
  writeDraft,
} from "@/lib/assistant/draft";

describe("Startie draft storage", () => {
  beforeEach(() => sessionStorage.clear());

  it("keys the unsaved thread separately from real threads", () => {
    expect(draftKey(null)).not.toBe(draftKey("abc"));
    expect(draftKey("abc")).toBe(draftKey("abc"));
  });

  it("round-trips a draft per thread", () => {
    writeDraft("t1", "half-written answer");
    writeDraft(null, "new thread text");
    expect(readDraft("t1")).toBe("half-written answer");
    expect(readDraft(null)).toBe("new thread text");
    expect(readDraft("t2")).toBe("");
  });

  it("removes the entry when the draft is emptied", () => {
    writeDraft("t1", "x");
    writeDraft("t1", "");
    expect(sessionStorage.getItem(draftKey("t1"))).toBeNull();
    expect(readDraft("t1")).toBe("");
  });

  it("never throws when storage is unavailable and keeps the draft in memory", () => {
    const original = Object.getOwnPropertyDescriptor(window, "sessionStorage");
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    try {
      expect(() => writeDraft("t1", "x")).not.toThrow();
      // The reload safety net is gone, but the page-lifetime draft survives.
      expect(readDraft("t1")).toBe("x");
    } finally {
      if (original) Object.defineProperty(window, "sessionStorage", original);
    }
  });

  it("notifies subscribers on every write, until they unsubscribe", () => {
    let calls = 0;
    const unsubscribe = subscribeDrafts(() => calls++);
    writeDraft("t1", "a");
    writeDraft("t1", "");
    expect(calls).toBe(2);
    unsubscribe();
    writeDraft("t1", "b");
    expect(calls).toBe(2);
  });
});
