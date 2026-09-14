import { describe, it, expect } from "vitest";
import { classifyRoute } from "@/lib/supabase/route-classification";

describe("classifyRoute", () => {
  it("treats / as public by exact match only", () => {
    expect(classifyRoute("/").isPublic).toBe(true);
    expect(classifyRoute("/dashboard").isPublic).toBe(false);
    expect(classifyRoute("/dashboard/admin").isPublic).toBe(false);
  });

  it("marks the auth, legal and setup routes public by prefix", () => {
    for (const p of [
      "/login",
      "/auth/callback",
      "/auth/confirm",
      "/auth/auth-code-error",
      "/auth/reset-password",
      "/profile/setup",
      "/invite",
      "/policy",
      "/terms",
      "/agreement/abc",
      "/privacy/scholarship-agreement",
    ]) {
      expect(classifyRoute(p).isPublic, p).toBe(true);
    }
  });

  it("marks /dashboard/** protected", () => {
    expect(classifyRoute("/dashboard").isProtected).toBe(true);
    expect(classifyRoute("/dashboard/my-journey").isProtected).toBe(true);
    expect(classifyRoute("/login").isProtected).toBe(false);
  });

  it("flags scholarship pages for noindex", () => {
    expect(
      classifyRoute("/full-scholarship-agreement").isScholarshipPublic
    ).toBe(true);
    expect(classifyRoute("/agreement/x").isScholarshipPublic).toBe(true);
    expect(classifyRoute("/login").isScholarshipPublic).toBe(false);
    expect(classifyRoute("/policy").isScholarshipPublic).toBe(false);
  });
});
