import { describe, expect, it } from "vitest";
import {
  IndividualWeeklyReportSchema,
  WeeklyReportSchema,
} from "@/lib/validation-schemas";
import {
  fieldErrorsFromIssues,
  firstErrorKey,
} from "@/lib/weekly-report-form-errors";

describe("fieldErrorsFromIssues", () => {
  it("keys solo-form issues by question and keeps the first message", () => {
    const result = IndividualWeeklyReportSchema.safeParse({
      commitments: [{ text: "abc", status: "completed" }],
      nextWeekCommitments: [],
      alignmentScore: 12,
      alignmentReason: "ok",
    });
    expect(result.success).toBe(false);
    const errors = fieldErrorsFromIssues(result.error!.issues);
    expect(errors.commitments).toBe("Commitment must be at least 5 characters");
    expect(errors.nextWeekCommitments).toBe(
      "At least one commitment for next week is required"
    );
    expect(errors.alignmentScore).toBe(
      "Alignment score must be a whole number between 1 and 10"
    );
    expect(errors.alignmentReason).toBe(
      "Alignment reason must be at least 5 characters"
    );
  });

  it("lands the team schema's meetings refine on keyInsight", () => {
    const result = WeeklyReportSchema.safeParse({
      commitments: [{ text: "Interview users", status: "completed" }],
      meetingsHeld: 2,
      keyInsight: "",
      mostImportantOutcome: "",
      measurableProgress: "Five signups",
      biggestAchievement: "Shipped it",
      achievementImpact: "More users",
      nextWeekCommitments: ["Keep going"],
      alignmentScore: 7,
      alignmentReason: "Steady",
    });
    expect(result.success).toBe(false);
    const errors = fieldErrorsFromIssues(result.error!.issues);
    expect(Object.keys(errors)).toEqual(["keyInsight"]);
  });

  it("returns an empty object for a valid payload", () => {
    const result = IndividualWeeklyReportSchema.safeParse({
      commitments: [{ text: "Interview users", status: "completed" }],
      nextWeekCommitments: ["Write summary"],
      alignmentScore: 8,
      alignmentReason: "Good week",
    });
    expect(result.success).toBe(true);
    expect(fieldErrorsFromIssues([])).toEqual({});
  });
});

describe("firstErrorKey", () => {
  it("follows the question order, not the object order", () => {
    const errors = { alignmentReason: "x", commitments: "y" };
    expect(
      firstErrorKey(errors, [
        "commitments",
        "blockers",
        "nextWeekCommitments",
        "alignmentScore",
        "alignmentReason",
      ])
    ).toBe("commitments");
    expect(firstErrorKey({}, ["commitments"])).toBeNull();
  });
});
