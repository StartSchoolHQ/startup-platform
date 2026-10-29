import { describe, expect, it } from "vitest";
import { pickTaskSeed } from "@/lib/task-draft-precedence";
import type { TaskDraft } from "@/lib/data/task-drafts";

const draft: TaskDraft = {
  draft: {
    description: "draft text",
    external_urls: [{ url: "https://a.test", title: "A", type: "external" }],
  },
  updated_at: "2026-10-28T12:00:00.000Z",
};

const rejected = {
  description: "rejected text",
  external_urls: [{ url: "https://r.test", title: "R", type: "external" }],
};

describe("pickTaskSeed", () => {
  it("draft newer than submission wins", () => {
    const result = pickTaskSeed({
      draft,
      rejected,
      submittedAt: "2026-10-28T11:00:00.000Z",
    });
    expect(result).toEqual({
      seed: {
        description: "draft text",
        external_urls: [
          { url: "https://a.test", title: "A", type: "external" },
        ],
      },
      restoredFromDraft: true,
    });
  });

  it("draft older than submission loses to rejected", () => {
    const result = pickTaskSeed({
      draft,
      rejected,
      submittedAt: "2026-10-28T13:00:00.000Z",
    });
    expect(result).toEqual({ seed: rejected, restoredFromDraft: false });
  });

  it("no submission → draft wins", () => {
    const result = pickTaskSeed({
      draft,
      rejected: undefined,
      submittedAt: null,
    });
    expect(result.restoredFromDraft).toBe(true);
    expect(result.seed?.description).toBe("draft text");
  });

  it("no draft → rejected", () => {
    const result = pickTaskSeed({
      draft: null,
      rejected,
      submittedAt: "2026-10-28T11:00:00.000Z",
    });
    expect(result).toEqual({ seed: rejected, restoredFromDraft: false });
  });

  it("neither → undefined", () => {
    const result = pickTaskSeed({
      draft: null,
      rejected: undefined,
      submittedAt: undefined,
    });
    expect(result).toEqual({ seed: undefined, restoredFromDraft: false });
  });
});
