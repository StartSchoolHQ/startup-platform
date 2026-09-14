import { describe, expect, it } from "vitest";
import { IndividualWeeklyReportSchema } from "@/lib/validation-schemas";
import {
  emptyIndividualReportForm,
  mapIndividualReportRpcError,
  normalizeIndividualReport,
} from "@/lib/individual-weekly-report";
import { isWeeklyReportBannerWindow } from "@/lib/weekly-reports";

const valid = {
  commitments: [
    {
      text: "Interview five users",
      status: "completed" as const,
      explanation: "",
    },
  ],
  blockers: "",
  nextWeekCommitments: ["Write the summary"],
  alignmentScore: 7,
  alignmentReason: "Good momentum",
};

describe("IndividualWeeklyReportSchema", () => {
  it("accepts a valid report", () => {
    expect(IndividualWeeklyReportSchema.safeParse(valid).success).toBe(true);
  });
  it("requires at least one commitment", () => {
    const r = IndividualWeeklyReportSchema.safeParse({
      ...valid,
      commitments: [],
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe(
      "At least one commitment is required"
    );
  });
  it("requires a 5-char alignment reason", () => {
    const r = IndividualWeeklyReportSchema.safeParse({
      ...valid,
      alignmentReason: "ok",
    });
    expect(r.success).toBe(false);
  });
  it("rejects a score outside 1-10", () => {
    expect(
      IndividualWeeklyReportSchema.safeParse({ ...valid, alignmentScore: 0 })
        .success
    ).toBe(false);
    expect(
      IndividualWeeklyReportSchema.safeParse({ ...valid, alignmentScore: 11 })
        .success
    ).toBe(false);
  });
  it("blockers are optional", () => {
    const { blockers: _b, ...noBlockers } = valid;
    expect(IndividualWeeklyReportSchema.safeParse(noBlockers).success).toBe(
      true
    );
  });
});

describe("normalizeIndividualReport", () => {
  it("drops blank rows and trims", () => {
    const form = emptyIndividualReportForm();
    form.commitments = [
      {
        text: "  Ship landing page ",
        status: "in_progress",
        explanation: " late ",
      },
      { text: "   ", status: "completed", explanation: "" },
    ];
    form.nextWeekCommitments = ["Call investors", "  ", ""];
    form.alignmentReason = " fine ";
    const out = normalizeIndividualReport(form);
    expect(out.commitments).toEqual([
      { text: "Ship landing page", status: "in_progress", explanation: "late" },
    ]);
    expect(out.nextWeekCommitments).toEqual(["Call investors"]);
    expect(out.alignmentReason).toBe("fine");
  });
  it("starts with one empty row each and score 5", () => {
    const form = emptyIndividualReportForm();
    expect(form.commitments).toHaveLength(1);
    expect(form.nextWeekCommitments).toEqual([""]);
    expect(form.alignmentScore).toBe(5);
  });
});

describe("mapIndividualReportRpcError", () => {
  it("maps the two codes and passes other messages through", () => {
    expect(mapIndividualReportRpcError("ALREADY_SUBMITTED")).toMatch(
      /already submitted/i
    );
    expect(mapIndividualReportRpcError("MY_JOURNEY_DISABLED")).toMatch(
      /My Journey is switched off/
    );
    expect(
      mapIndividualReportRpcError(
        "Alignment reason must be at least 5 characters"
      )
    ).toBe("Alignment reason must be at least 5 characters");
  });
});

describe("isWeeklyReportBannerWindow", () => {
  const week = {
    week_start: "2026-09-14",
    week_end: "2026-09-20",
    week_number: 38,
    week_year: 2026,
  };
  // `week_start` is a date-only string, parsed as UTC midnight; in Riga that
  // is 03:00 local, so the window opens Friday ~03:00 (same as the team
  // banner). Use midday timestamps to stay clear of that edge.
  it("is closed on Thursday and open from Friday", () => {
    expect(
      isWeeklyReportBannerWindow(week, new Date("2026-09-17T12:00:00"))
    ).toBe(false);
    expect(
      isWeeklyReportBannerWindow(week, new Date("2026-09-18T12:00:00"))
    ).toBe(true);
    expect(
      isWeeklyReportBannerWindow(week, new Date("2026-09-20T23:00:00"))
    ).toBe(true);
  });
});
