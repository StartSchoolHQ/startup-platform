// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { draftKey, readDraft, writeDraft } from "@/lib/assistant/draft";

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

  it("never throws when storage is unavailable", () => {
    const original = Object.getOwnPropertyDescriptor(window, "sessionStorage");
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    try {
      expect(() => writeDraft("t1", "x")).not.toThrow();
      expect(readDraft("t1")).toBe("");
    } finally {
      if (original) Object.defineProperty(window, "sessionStorage", original);
    }
  });
});
