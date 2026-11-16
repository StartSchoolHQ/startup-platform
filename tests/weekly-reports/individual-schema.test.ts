import { describe, expect, it } from "vitest";
import { IndividualWeeklyReportSchema } from "@/lib/validation-schemas";
import {
  emptyIndividualReportForm,
  mapIndividualReportRpcError,
  normalizeIndividualReport,
  prefillCommitmentsFromHistory,
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
    const noBlockers = { ...valid, blockers: undefined };
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

describe("prefillCommitmentsFromHistory", () => {
  const week = {
    week_start: "2026-11-02",
    week_end: "2026-11-08",
    week_number: 45,
    week_year: 2026,
  };
  const entry = (
    week_year: number,
    week_number: number,
    nextWeekCommitments: string[]
  ) => ({
    id: `${week_year}-${week_number}`,
    week_year,
    week_number,
    week_start_date: "2026-01-01",
    week_end_date: "2026-01-07",
    submitted_at: null,
    submission_data: { ...valid, nextWeekCommitments },
  });

  it("turns the previous report's plan into in-progress rows", () => {
    const rows = prefillCommitmentsFromHistory({
      week,
      history: [entry(2026, 44, ["Call ten users", "  Draft the pitch "])],
    });
    expect(rows).toEqual([
      { text: "Call ten users", status: "in_progress", explanation: "" },
      { text: "Draft the pitch", status: "in_progress", explanation: "" },
    ]);
  });
  it("returns nothing without a previous report", () => {
    expect(prefillCommitmentsFromHistory({ week, history: [] })).toEqual([]);
  });
  it("uses the newest older report, even after a skipped week", () => {
    const rows = prefillCommitmentsFromHistory({
      week,
      history: [
        entry(2026, 42, ["Newest older plan"]),
        entry(2026, 40, ["Stale plan"]),
      ],
    });
    expect(rows.map((r) => r.text)).toEqual(["Newest older plan"]);
  });
  it("ignores the reported week itself and crosses the year boundary", () => {
    const rows = prefillCommitmentsFromHistory({
      week: { ...week, week_number: 1, week_year: 2027 },
      history: [
        entry(2027, 1, ["This week's own plan"]),
        entry(2026, 52, ["December plan"]),
      ],
    });
    expect(rows.map((r) => r.text)).toEqual(["December plan"]);
  });
  it("drops blank and non-string lines, and survives missing data", () => {
    const broken = { ...entry(2026, 44, []), submission_data: null };
    expect(prefillCommitmentsFromHistory({ week, history: [broken] })).toEqual(
      []
    );
    const mixed = entry(2026, 44, ["", "  ", "Real one"]);
    (mixed.submission_data.nextWeekCommitments as unknown[]).push(42);
    expect(
      prefillCommitmentsFromHistory({ week, history: [mixed] }).map(
        (r) => r.text
      )
    ).toEqual(["Real one"]);
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
