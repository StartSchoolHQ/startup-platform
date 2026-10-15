// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  openStartie,
  reviewFeedbackDraft,
  STARTIE_OPEN_EVENT,
  type StartieOpenDetail,
} from "@/lib/assistant/open";

describe("reviewFeedbackDraft", () => {
  it("names the task, the attempt and the failed checks", () => {
    const draft = reviewFeedbackDraft({
      title: "Interview 3 users",
      attempt: 4,
      failedChecks: ["Real interviewee named", " Date of conversation "],
    });
    expect(draft).toContain('"Interview 3 users"');
    expect(draft).toContain("attempt 4");
    expect(draft).toContain(
      "Failed checks: Real interviewee named; Date of conversation."
    );
    expect(draft).toMatch(/what evidence should I add\?$/);
  });

  it("omits the attempt on a first try and the checks line when there are none", () => {
    const draft = reviewFeedbackDraft({
      title: "T",
      attempt: 1,
      failedChecks: [],
    });
    expect(draft).not.toContain("attempt");
    expect(draft).not.toContain("Failed checks");
  });
});

describe("openStartie", () => {
  it("dispatches the open event with the draft and source", () => {
    let received: StartieOpenDetail | null = null;
    window.addEventListener(STARTIE_OPEN_EVENT, (e) => {
      received = (e as CustomEvent<StartieOpenDetail>).detail;
    });
    openStartie({ draft: "why?", source: "review_feedback" });
    expect(received).toEqual({ draft: "why?", source: "review_feedback" });
  });
});
