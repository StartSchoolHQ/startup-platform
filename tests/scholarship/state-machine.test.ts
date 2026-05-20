import { describe, expect, it } from "vitest";
import {
  canTransition,
  type ScholarshipStatus,
} from "@/lib/scholarship/state-machine";

const happyPath: Array<[ScholarshipStatus, ScholarshipStatus]> = [
  ["draft", "identity_verified"],
  ["identity_verified", "awaiting_student_signature"],
  ["awaiting_student_signature", "student_signed"],
  ["student_signed", "awaiting_school_signature"],
  ["awaiting_school_signature", "school_signed"],
  ["school_signed", "archived"],
];

describe("scholarship state-machine", () => {
  describe("happy path", () => {
    it.each(happyPath)("allows %s → %s", (from, to) => {
      expect(canTransition(from, to)).toBe(true);
    });
  });

  describe("cancel", () => {
    const cancelable: ScholarshipStatus[] = [
      "draft",
      "identity_verified",
      "awaiting_student_signature",
      "student_signed",
      "awaiting_school_signature",
      "school_signed",
      "failed",
      "expired",
    ];
    it.each(cancelable)("allows %s → cancelled", (from) => {
      expect(canTransition(from, "cancelled")).toBe(true);
    });

    it("rejects archived → cancelled", () => {
      expect(canTransition("archived", "cancelled")).toBe(false);
    });
  });

  describe("expire", () => {
    const expirable: ScholarshipStatus[] = [
      "draft",
      "identity_verified",
      "awaiting_student_signature",
      "student_signed",
      "awaiting_school_signature",
      "failed",
    ];
    it.each(expirable)("allows %s → expired", (from) => {
      expect(canTransition(from, "expired")).toBe(true);
    });

    const notExpirable: ScholarshipStatus[] = [
      "school_signed",
      "archived",
      "cancelled",
      "expired",
    ];
    it.each(notExpirable)("rejects %s → expired", (from) => {
      expect(canTransition(from, "expired")).toBe(false);
    });
  });

  describe("failed", () => {
    it("allows identity_verified → failed", () => {
      expect(canTransition("identity_verified", "failed")).toBe(true);
    });

    it("rejects archived → failed", () => {
      expect(canTransition("archived", "failed")).toBe(false);
    });

    it("rejects cancelled → failed", () => {
      expect(canTransition("cancelled", "failed")).toBe(false);
    });
  });

  describe("invalid forward jumps", () => {
    it("rejects draft → awaiting_student_signature (must verify identity first)", () => {
      expect(canTransition("draft", "awaiting_student_signature")).toBe(false);
    });

    it("rejects draft → student_signed", () => {
      expect(canTransition("draft", "student_signed")).toBe(false);
    });

    it("rejects student_signed → archived (must school-sign first)", () => {
      expect(canTransition("student_signed", "archived")).toBe(false);
    });

    it("rejects archived → archived (idempotent terminal)", () => {
      expect(canTransition("archived", "archived")).toBe(false);
    });
  });

  describe("terminal states have no outgoing transitions (except cancel-from-non-archived)", () => {
    it("archived has no outgoing transitions", () => {
      const all: ScholarshipStatus[] = [
        "draft",
        "identity_verified",
        "awaiting_student_signature",
        "student_signed",
        "awaiting_school_signature",
        "school_signed",
        "archived",
        "cancelled",
        "expired",
        "failed",
      ];
      for (const to of all) {
        expect(canTransition("archived", to)).toBe(false);
      }
    });
  });
});
