import { describe, expect, it } from "vitest";
import { buildSubmissionHistory } from "@/lib/my-journey-history";

const cronEntry = (date: string, description: string, feedback = "Good.") => ({
  submission_data: { description, files: [], external_urls: [] },
  completed_at: date,
  review_feedback: feedback,
  reviewer_user_id: null,
  assigned_to_user_id: null,
  points_awarded: 40,
  status: "approved",
});

const resubmitEntry = (date: string, description: string) => ({
  submission_data: { description, files: ["https://x.test/a.png"] },
  submitted_at: date,
  status: "rejected",
});

describe("buildSubmissionHistory", () => {
  it("returns an empty list for missing or malformed history", () => {
    expect(buildSubmissionHistory(null)).toEqual([]);
    expect(buildSubmissionHistory("nope")).toEqual([]);
    expect(buildSubmissionHistory([null, 3, "x"])).toEqual([]);
  });

  it("numbers approved cycles oldest-first and lists newest first", () => {
    const list = buildSubmissionHistory([
      cronEntry("2026-07-01T10:00:00Z", "July: I cold-emailed one founder."),
      cronEntry("2026-08-01T10:00:00Z", "August: I pitched on stage."),
    ]);
    expect(list.map((e) => e.cycle)).toEqual([2, 1]);
    expect(list[0].description).toMatch(/^August/);
    expect(list[0].kind).toBe("cycle");
    expect(list[0].points).toBe(40);
    expect(list[0].feedback).toBe("Good.");
  });

  it("treats a resubmit archive as an attempt with the submitted date", () => {
    const [attempt] = buildSubmissionHistory([
      resubmitEntry("2026-08-03T10:00:00Z", "Too vague."),
    ]);
    expect(attempt.kind).toBe("attempt");
    expect(attempt.cycle).toBeNull();
    expect(attempt.status).toBe("rejected");
    expect(attempt.date).toBe("2026-08-03T10:00:00Z");
    expect(attempt.files.map((f) => f.name)).toEqual(["a.png"]);
  });

  it("folds the live submission in as the newest entry", () => {
    const list = buildSubmissionHistory(
      [cronEntry("2026-08-01T10:00:00Z", "August.")],
      {
        submission_data: { description: "September, still cooling down." },
        status: "approved",
        completed_at: "2026-09-01T10:00:00Z",
        review_feedback: "Sharper than last month.",
      }
    );
    expect(list[0].kind).toBe("current");
    expect(list[0].cycle).toBe(2);
    expect(list[1].cycle).toBe(1);
  });

  it("skips the live row when nothing has been submitted this cycle", () => {
    const list = buildSubmissionHistory(
      [cronEntry("2026-08-01T10:00:00Z", "August.")],
      { submission_data: null, status: "in_progress" }
    );
    expect(list).toHaveLength(1);
    expect(list[0].kind).toBe("cycle");
  });
});
