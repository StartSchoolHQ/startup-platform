/**
 * Unit tests for the Dokobit error-code → user-message mapping.
 *
 * Why this matters: Dokobit's integration review checklist specifically
 * calls out codes 6001 / 6005 / 6006 / 6007 / 6008 / 7023 as ones we
 * should translate to clear UX. A silent regression here would mean a
 * cancelled student gets the generic "Something went wrong" instead of
 * "You cancelled the signing" — small UX hit, but exactly the kind of
 * thing the reviewer asks about. So we lock the mapping in.
 */
import { describe, expect, it } from "vitest";
import {
  DOKOBIT_USER_MESSAGES,
  extractDokobitErrorCode,
  userMessageForDokobitError,
} from "@/lib/dokobit/errors";

describe("extractDokobitErrorCode", () => {
  it.each([6001, 6005, 6006, 6007, 6008, 7023] as const)(
    "returns the code for handled value %i",
    (code) => {
      expect(extractDokobitErrorCode({ error_code: code })).toBe(code);
    }
  );

  it("returns null for an unhandled numeric code", () => {
    expect(extractDokobitErrorCode({ error_code: 9999 })).toBeNull();
  });

  it("returns null when error_code is missing", () => {
    expect(extractDokobitErrorCode({ status: "error" })).toBeNull();
  });

  it("returns null when error_code is a string (defensive)", () => {
    expect(extractDokobitErrorCode({ error_code: "6005" })).toBeNull();
  });

  it("returns null for non-object payloads", () => {
    expect(extractDokobitErrorCode(null)).toBeNull();
    expect(extractDokobitErrorCode(undefined)).toBeNull();
    expect(extractDokobitErrorCode("error_code: 6005")).toBeNull();
    expect(extractDokobitErrorCode(7023)).toBeNull();
  });

  it("works on a realistic status-endpoint shape", () => {
    const payload = {
      status: "error",
      message: "Signing canceled by user.",
      error_code: 7023,
    };
    expect(extractDokobitErrorCode(payload)).toBe(7023);
  });
});

describe("userMessageForDokobitError", () => {
  it("returns a non-empty string for every handled code", () => {
    for (const code of [6001, 6005, 6006, 6007, 6008, 7023] as const) {
      const msg = userMessageForDokobitError({ error_code: code });
      expect(msg).toBe(DOKOBIT_USER_MESSAGES[code]);
      expect(msg && msg.length).toBeGreaterThan(0);
    }
  });

  it("returns null for unhandled codes (caller falls back to generic copy)", () => {
    expect(userMessageForDokobitError({ error_code: 1234 })).toBeNull();
    expect(userMessageForDokobitError({})).toBeNull();
  });

  it("user-cancelled message mentions cancellation (sanity-check copy)", () => {
    const msg = userMessageForDokobitError({ error_code: 7023 });
    expect(msg).toMatch(/cancel/i);
  });

  it("session-expired message mentions starting over", () => {
    const msg = userMessageForDokobitError({ error_code: 6005 });
    expect(msg).toMatch(/start over/i);
  });
});
