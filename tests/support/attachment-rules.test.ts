import { describe, expect, it } from "vitest";
import {
  attachmentPath,
  formatFileSize,
  sanitizeFileName,
} from "@/lib/support/attachment-rules";

describe("sanitizeFileName", () => {
  it("keeps letters, digits, dots and dashes; replaces the rest", () => {
    expect(sanitizeFileName("Screen shot (1).PNG")).toBe("Screen_shot__1_.PNG");
  });
  it("caps very long names at 120 chars", () => {
    expect(sanitizeFileName("a".repeat(300) + ".png")).toHaveLength(120);
  });
});

describe("attachmentPath", () => {
  it("nests under user then ticket and prefixes a timestamp", () => {
    const path = attachmentPath("u1", "t1", "bug.png");
    expect(path).toMatch(/^u1\/t1\/\d{13}-bug\.png$/);
  });
});

describe("formatFileSize", () => {
  it("formats bytes >= 1MB as decimal MB", () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
  it("formats bytes < 1MB as rounded KB", () => {
    expect(formatFileSize(340 * 1024)).toBe("340 KB");
  });
});
