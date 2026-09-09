import { describe, expect, it } from "vitest";
import {
  classifyLink,
  htmlToText,
  toFetchableUrl,
} from "@/lib/ai-review/evidence/links";

describe("classifyLink", () => {
  it("detects storage, google, search and generic", () => {
    expect(
      classifyLink(
        "https://ksoohvygoysofvtqdumz.supabase.co/storage/v1/object/public/task-files/x.pdf"
      )
    ).toBe("storage_file");
    expect(
      classifyLink("https://docs.google.com/document/d/ABC/edit?tab=t.0")
    ).toBe("google_doc");
    expect(
      classifyLink("https://docs.google.com/spreadsheets/d/ABC/edit#gid=0")
    ).toBe("google_sheet");
    expect(
      classifyLink("https://docs.google.com/presentation/d/ABC/edit")
    ).toBe("google_slides");
    expect(classifyLink("https://www.google.com/search?q=x")).toBe(
      "search_results"
    );
    expect(classifyLink("https://duckduckgo.com/?q=x")).toBe("search_results");
    expect(classifyLink("https://dour-chip-31a.notion.site/Page-abc")).toBe(
      "generic"
    );
  });

  it("does not trust a storage-shaped path on a foreign host", () => {
    expect(
      classifyLink(
        "https://evil.example/storage/v1/object/public/task-files/x.pdf"
      )
    ).toBe("generic");
  });
});

describe("toFetchableUrl", () => {
  it("rewrites google docs to export endpoints", () => {
    expect(
      toFetchableUrl("https://docs.google.com/document/d/ABC/edit?usp=sharing")
    ).toBe("https://docs.google.com/document/d/ABC/export?format=txt");
    expect(
      toFetchableUrl("https://docs.google.com/spreadsheets/d/ABC/edit#gid=0")
    ).toBe("https://docs.google.com/spreadsheets/d/ABC/export?format=csv");
    expect(
      toFetchableUrl("https://docs.google.com/presentation/d/ABC/edit")
    ).toBe("https://docs.google.com/presentation/d/ABC/export/txt");
    expect(toFetchableUrl("https://x.test/a")).toBe("https://x.test/a");
    expect(toFetchableUrl("www.x.test")).toBe("https://www.x.test");
  });
});

describe("htmlToText", () => {
  it("drops scripts/styles and collapses whitespace", () => {
    const t = htmlToText(
      "<html><head><style>a{}</style><script>1</script><title>T</title></head><body><nav>menu</nav><h1>Hello</h1>\n\n<p>World   again</p></body></html>"
    );
    expect(t).toBe("T\nHello\nWorld again");
  });
});
