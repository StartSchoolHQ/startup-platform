import { describe, it, expect } from "vitest";
import { isProfileComplete } from "@/lib/profile-utils";

const base = { id: "u1", email: "a@startschool.org" };

describe("isProfileComplete", () => {
  it("is true with both name and avatar", () => {
    expect(
      isProfileComplete({ ...base, name: "Ann", avatar_url: "https://x/a.png" })
    ).toBe(true);
  });
  it("is false without avatar", () => {
    expect(isProfileComplete({ ...base, name: "Ann", avatar_url: null })).toBe(
      false
    );
  });
  it("is false without name", () => {
    expect(
      isProfileComplete({ ...base, name: null, avatar_url: "https://x/a.png" })
    ).toBe(false);
  });
  it("is false for whitespace-only values", () => {
    expect(isProfileComplete({ ...base, name: "  ", avatar_url: " " })).toBe(
      false
    );
  });
  it("is false for null profile", () => {
    expect(isProfileComplete(null)).toBe(false);
  });
});
