import { describe, expect, it } from "vitest";
import { adminNavItems } from "@/components/admin-nav-items";

describe("adminNavItems", () => {
  it("groups the admin panel by purpose, in this order", () => {
    const sections = [...new Set(adminNavItems(false).map((i) => i.section))];
    expect(sections).toEqual([
      "Insights",
      "People",
      "Curriculum",
      "Teams · paused",
      "AI",
      "Support",
      "System",
    ]);
  });

  it("drops the paused label when Team Journey is on", () => {
    expect(adminNavItems(true).some((i) => i.section === "Teams")).toBe(true);
    expect(adminNavItems(true).some((i) => i.section?.includes("paused"))).toBe(
      false
    );
  });

  it("puts each page in the section a newcomer would look in", () => {
    const by = Object.fromEntries(
      adminNavItems(false).map((i) => [i.title, i.section])
    );
    expect(by["Analytics"]).toBe("Insights");
    expect(by["Activity Log"]).toBe("Insights");
    expect(by["AI Reviews"]).toBe("AI");
    expect(by["Startie"]).toBe("AI");
    expect(by["Inbox"]).toBe("Support");
    expect(by["Settings"]).toBe("System");
    expect(by["Weekly Reports"]).toBe("Teams · paused");
  });

  it("has unique urls and titles", () => {
    const items = adminNavItems(true);
    expect(new Set(items.map((i) => i.url)).size).toBe(items.length);
    expect(new Set(items.map((i) => i.title)).size).toBe(items.length);
    expect(items.map((i) => i.url)).toContain("/dashboard/admin/startie");
  });
});
