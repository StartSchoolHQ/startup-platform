import { describe, expect, it } from "vitest";
import { normalizeSubmission } from "@/lib/ai-review/normalize";

describe("normalizeSubmission", () => {
  it("parses a double-encoded JSON string", () => {
    const raw = JSON.stringify({
      description: "hi",
      external_urls: ["https://a.test"],
      files: ["https://s/x.pdf"],
    });
    const out = normalizeSubmission(raw);
    expect(out.description).toBe("hi");
    expect(out.links).toEqual([{ url: "https://a.test", title: "" }]);
    expect(out.files[0]).toMatchObject({
      url: "https://s/x.pdf",
      name: "x.pdf",
    });
  });

  it("accepts object url items and recovers a URL from title when url is empty", () => {
    const out = normalizeSubmission({
      external_urls: [
        { url: "https://b.test", type: "link", title: "B" },
        { url: "", type: "link", title: "https://c.test" },
        { url: "", type: "link", title: "" },
      ],
    });
    expect(out.links.map((l) => l.url)).toEqual([
      "https://b.test",
      "https://c.test",
    ]);
  });

  it("merges top-level url and dedupes", () => {
    const out = normalizeSubmission({
      url: "https://a.test",
      external_urls: ["https://a.test", "https://d.test"],
    });
    expect(out.links.map((l) => l.url)).toEqual([
      "https://a.test",
      "https://d.test",
    ]);
  });

  it("accepts object file items and legacy screenshots[]", () => {
    const out = normalizeSubmission({
      files: [
        { url: "https://s/b.png", name: "b.png", size: 12, type: "image/png" },
      ],
      screenshots: ["https://s/c.jpg"],
    });
    expect(out.files).toEqual([
      { url: "https://s/b.png", name: "b.png", size: 12, type: "image/png" },
      { url: "https://s/c.jpg", name: "c.jpg", size: null, type: null },
    ]);
  });

  it("never throws on garbage", () => {
    expect(normalizeSubmission(null)).toEqual({
      description: "",
      links: [],
      files: [],
    });
    expect(normalizeSubmission("not json")).toEqual({
      description: "not json",
      links: [],
      files: [],
    });
    expect(normalizeSubmission(42)).toEqual({
      description: "",
      links: [],
      files: [],
    });
  });
});
