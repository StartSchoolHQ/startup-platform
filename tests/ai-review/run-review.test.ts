import { describe, expect, it } from "vitest";
import { runReviewOnSnapshot } from "@/lib/ai-review/run-review";
import type {
  AiReviewSettings,
  CriteriaSnapshot,
  NormalizedSubmission,
} from "@/lib/ai-review/types";

const settings: AiReviewSettings = {
  enabled: true,
  mode: "ai",
  model: "gpt-5.4",
  confidenceThreshold: 0.75,
  workerUrl: "",
  maxFileMb: 25,
  maxPdfPages: 40,
  attemptFlagThreshold: 5,
};

const snapshot: NormalizedSubmission = {
  description: "done",
  links: [],
  files: [],
};

describe("runReviewOnSnapshot — zero-criteria guard", () => {
  it("throws task_has_no_criteria when criteria is an empty array, before any network/OpenAI call", async () => {
    const criteria: CriteriaSnapshot = {
      criteria: [],
      review_instructions: null,
      deliverables: [],
      title: "Task",
      description: null,
    };
    // No OPENAI_API_KEY is configured in this test env; if the guard didn't
    // fire before reviewWithModel/getOpenAI, this would throw a different
    // error ("OPENAI_API_KEY is not set") instead.
    await expect(
      runReviewOnSnapshot(snapshot, criteria, settings)
    ).rejects.toThrow("task_has_no_criteria");
  });

  it("throws task_has_no_criteria when every category has zero points", async () => {
    const criteria: CriteriaSnapshot = {
      criteria: [
        { category: "What to evaluate", points: [] },
        { category: "Reject if", points: [] },
      ],
      review_instructions: null,
      deliverables: [],
      title: "Task",
      description: null,
    };
    await expect(
      runReviewOnSnapshot(snapshot, criteria, settings)
    ).rejects.toThrow("task_has_no_criteria");
  });
});
