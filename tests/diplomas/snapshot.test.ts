import { describe, expect, it } from "vitest";
import { buildSnapshot, checkReadiness } from "@/lib/diplomas/snapshot";
import type { BatchRow, RpcDiplomaData } from "@/lib/diplomas/types";

const rpc: RpcDiplomaData = {
  student: {
    name: "Test User",
    personal_code: "010101-11111",
    qwasar_username: "user_t",
  },
  startup_name: "TestStartup",
  startup_modules: [
    { category: "pitch", hours: 10, percent: 100 },
    { category: "idea-validation", hours: 42, percent: 87 },
  ],
  tech_modules: [
    {
      track: "Onboarding",
      display_name: "Onboarding",
      weeks: 1,
      description: "d",
      percent: 100,
    },
  ],
};

const batch: BatchRow = {
  id: "b",
  name: "Mercury-Redstone",
  admission_date: "2025-09-01",
  completion_date: "2026-08-01",
  number_prefix: "B1",
  next_seq: 2,
};

describe("buildSnapshot", () => {
  it("orders startup modules per STARTUP_CATEGORIES and fills content", () => {
    const s = buildSnapshot({
      rpc,
      batch,
      diplomaNumber: "B1-S001",
      diplomaType: "full",
      issuedDate: "2026-08-03",
    });
    // idea-validation is defined before pitch in STARTUP_CATEGORIES
    expect(s.startup_modules.map((m) => m.category)).toEqual([
      "idea-validation",
      "pitch",
    ]);
    expect(s.startup_modules[0].displayName).toMatch(/Idea Validation/);
    expect(s.startup_name).toBe("TestStartup");
    expect(s.diploma_number).toBe("B1-S001");
  });

  it("drops tech tracks below 75% from the snapshot", () => {
    const withLow: RpcDiplomaData = {
      ...rpc,
      tech_modules: [
        ...rpc.tech_modules,
        {
          track: "Season 03 React",
          display_name: "Season 03 React (Frontend)",
          weeks: null,
          description: null,
          percent: 74,
        },
        {
          track: "Season 01 Arc 02",
          display_name: "Season 01 Arc 02",
          weeks: null,
          description: null,
          percent: 0,
        },
        {
          track: "Season 02 Fullstack",
          display_name: "Season 02 Fullstack",
          weeks: 11,
          description: null,
          percent: 75,
        },
      ],
    };
    const s = buildSnapshot({
      rpc: withLow,
      batch,
      diplomaNumber: "B1-S003",
      diplomaType: "full",
      issuedDate: "2026-08-03",
    });
    expect(s.tech_modules.map((t) => t.track)).toEqual([
      "Onboarding",
      "Season 02 Fullstack",
    ]);
  });

  it("tech_only drops startup modules and startup name", () => {
    const s = buildSnapshot({
      rpc,
      batch,
      diplomaNumber: "B1-S002",
      diplomaType: "tech_only",
      issuedDate: "2026-08-03",
    });
    expect(s.startup_modules).toEqual([]);
    expect(s.startup_name).toBeNull();
  });

  it("throws when personal_code missing", () => {
    const bad = { ...rpc, student: { ...rpc.student, personal_code: null } };
    expect(() =>
      buildSnapshot({
        rpc: bad,
        batch,
        diplomaNumber: "x",
        diplomaType: "full",
        issuedDate: "2026-08-03",
      })
    ).toThrow("missing_personal_code");
  });

  it("throws when batch dates missing", () => {
    expect(() =>
      buildSnapshot({
        rpc,
        batch: { ...batch, admission_date: null },
        diplomaNumber: "x",
        diplomaType: "full",
        issuedDate: "2026-08-03",
      })
    ).toThrow("missing_batch_dates");
  });

  it("throws when qwasar_username missing", () => {
    const bad = { ...rpc, student: { ...rpc.student, qwasar_username: null } };
    expect(() =>
      buildSnapshot({
        rpc: bad,
        batch,
        diplomaNumber: "x",
        diplomaType: "full",
        issuedDate: "2026-08-03",
      })
    ).toThrow("missing_qwasar_username");
  });
});

describe("checkReadiness", () => {
  it("reports all green for a complete student", () => {
    expect(checkReadiness(rpc, batch)).toEqual({
      qwasar_username: true,
      personal_code: true,
      batch_dates: true,
      has_qwasar_rows: true,
    });
  });

  it("flags missing pieces without throwing", () => {
    const bad: RpcDiplomaData = {
      ...rpc,
      student: { ...rpc.student, personal_code: null, qwasar_username: null },
      tech_modules: [],
    };
    expect(checkReadiness(bad, { ...batch, completion_date: null })).toEqual({
      qwasar_username: false,
      personal_code: false,
      batch_dates: false,
      has_qwasar_rows: false,
    });
  });
});

describe("renderDiplomaHtml", () => {
  it("renders snapshot values into the HTML", async () => {
    const { renderDiplomaHtml } = await import("@/lib/diplomas/pdf-template");
    const s = buildSnapshot({
      rpc,
      batch,
      diplomaNumber: "B1-S001",
      diplomaType: "full",
      issuedDate: "2026-08-03",
    });
    const html = renderDiplomaHtml(s);
    expect(html).toContain("B1-S001");
    expect(html).toContain("Test User");
    expect(html).toContain("TestStartup");
    expect(html).toContain("Idea Validation");
    expect(html).toContain("Startup Module");
  });

  it("tech_only omits the Startup Module section", async () => {
    const { renderDiplomaHtml } = await import("@/lib/diplomas/pdf-template");
    const s = buildSnapshot({
      rpc,
      batch,
      diplomaNumber: "B1-S002",
      diplomaType: "tech_only",
      issuedDate: "2026-08-03",
    });
    const html = renderDiplomaHtml(s);
    expect(html).not.toContain("Startup Module");
    expect(html).not.toContain("Title of Startup");
  });
});
