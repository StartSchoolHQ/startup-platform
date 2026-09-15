import { describe, expect, it } from "vitest";
import {
  FOUNDER_CARD_SECTIONS,
  initials,
  leanLabel,
  memberSince,
} from "@/lib/profile-card";

describe("profile card helpers", () => {
  it("maps every founder lean to a short label", () => {
    expect(leanLabel("tech")).toBe("Tech");
    expect(leanLabel("business")).toBe("Business");
    expect(leanLabel("both")).toBe("Tech + Business");
  });

  it("builds initials from the first letters of up to two names", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Cher")).toBe("C");
    expect(initials("Jean Luc Picard")).toBe("JL");
    expect(initials("  ")).toBe("?");
    expect(initials(null)).toBe("?");
  });

  it("formats member-since as month and year", () => {
    expect(memberSince("2026-09-14T10:00:00Z")).toBe("Sep 2026");
    expect(memberSince(null)).toBeNull();
    expect(memberSince("not-a-date")).toBeNull();
  });

  it("lists the four founder card sections in form order", () => {
    expect(FOUNDER_CARD_SECTIONS.map((s) => s.key)).toEqual([
      "background_reason",
      "bio_energizes",
      "bio_skills",
      "bio_gaps",
    ]);
    for (const s of FOUNDER_CARD_SECTIONS) {
      expect(s.label).not.toContain("*");
    }
  });
});
