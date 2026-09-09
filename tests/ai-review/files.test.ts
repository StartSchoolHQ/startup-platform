import { describe, expect, it } from "vitest";
import {
  classifyFile,
  countPdfPages,
  loadFileEvidence,
} from "@/lib/ai-review/evidence/files";
import type { NormalizedFile } from "@/lib/ai-review/types";

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-files/task-submissions/p/u`;

const limits = {
  maxBytes: 25_000_000,
  remainingBytes: 25_000_000,
  maxChars: 30_000,
  maxPdfPages: 40,
  timeoutMs: 10_000,
};

const file = (over: Partial<NormalizedFile>): NormalizedFile => ({
  url: `${STORAGE_BASE}/shot.png`,
  name: "shot.png",
  size: null,
  type: null,
  ...over,
});

describe("countPdfPages", () => {
  it("counts /Type /Page objects and ignores /Type /Pages", () => {
    const pdf = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type /Pages /Kids[2 0 R 3 0 R]>>endobj\n" +
        "2 0 obj<</Type /Page>>endobj\n3 0 obj<</Type/Page>>endobj\n%%EOF",
      "latin1"
    );
    expect(countPdfPages(pdf)).toBe(2);
  });

  it("returns 0 for something that is not a PDF", () => {
    expect(countPdfPages(Buffer.from("hello", "utf8"))).toBe(0);
  });
});

describe("classifyFile", () => {
  it("treats SVG as unsupported, not an image", () => {
    expect(classifyFile("logo.svg", null)).toBe("unsupported");
    expect(classifyFile("logo", "image/svg+xml")).toBe("unsupported");
    expect(classifyFile("shot.png", "image/png")).toBe("image");
  });
});

describe("loadFileEvidence — storage-only file URLs", () => {
  it("passes an image served by our own storage host to the model", async () => {
    const item = await loadFileEvidence(file({}), "file-1", limits);
    expect(item.kind).toBe("image");
    expect(item.imageUrl).toBe(file({}).url);
  });

  it("marks an image hosted anywhere else as unverifiable", async () => {
    const item = await loadFileEvidence(
      file({ url: "https://evil.example/shot.png" }),
      "file-1",
      limits
    );
    expect(item.kind).toBe("unverifiable");
    expect(item.note).toContain("uploaded through the submission form");
    expect(item.imageUrl).toBeUndefined();
  });

  it("marks a non-image foreign file URL as unverifiable without downloading", async () => {
    const item = await loadFileEvidence(
      file({ url: "https://evil.example/deck.pdf", name: "deck.pdf" }),
      "file-1",
      limits
    );
    expect(item.kind).toBe("unverifiable");
  });

  it("explains SVG instead of sending it", async () => {
    const item = await loadFileEvidence(
      file({ url: `${STORAGE_BASE}/logo.svg`, name: "logo.svg" }),
      "file-1",
      limits
    );
    expect(item.kind).toBe("unsupported");
    expect(item.note).toContain("PNG or JPG");
  });

  it("refuses a download once the total byte budget is spent", async () => {
    const item = await loadFileEvidence(
      file({ url: `${STORAGE_BASE}/deck.pdf`, name: "deck.pdf" }),
      "file-2",
      { ...limits, remainingBytes: 0 }
    );
    expect(item.kind).toBe("too_large");
    expect(item.note).toContain("Total attachment size exceeds the 25 MB");
  });
});
