import { describe, expect, it } from "vitest";
import {
  parseQwasarProgressCsv,
  parseUsernameMappingCsv,
} from "@/lib/diplomas/csv";

const QWASAR_HEADER =
  "User ID,Name,Login,Status,Email,Last Login,Cohort Name,Onboarding,Preseason Web,Some Future Track";

describe("parseQwasarProgressCsv", () => {
  it("produces one row per non-empty track cell, keyed by header name", () => {
    const text = `${QWASAR_HEADER}\n16374,Janis Vedla,vedla_j,active,j@x.org,2026-02-26,Mercury-Redstone,100,84,`;
    const { rows } = parseQwasarProgressCsv(text);
    expect(rows).toEqual([
      {
        qwasar_login: "vedla_j",
        track: "Onboarding",
        percent: 100,
        cohort: "Mercury-Redstone",
        qwasar_status: "active",
      },
      {
        qwasar_login: "vedla_j",
        track: "Preseason Web",
        percent: 84,
        cohort: "Mercury-Redstone",
        qwasar_status: "active",
      },
    ]);
  });

  it("empty cell means never enrolled — NO row, and 0 means a real row", () => {
    const text = `${QWASAR_HEADER}\n1,A B,ab,active,a@x.org,2026-01-01,C1,0,,`;
    const { rows } = parseQwasarProgressCsv(text);
    expect(rows).toEqual([
      {
        qwasar_login: "ab",
        track: "Onboarding",
        percent: 0,
        cohort: "C1",
        qwasar_status: "active",
      },
    ]);
  });

  it("tolerates unknown future track columns and reports them", () => {
    const text = `${QWASAR_HEADER}\n1,A B,ab,active,a@x.org,2026-01-01,C1,,,55`;
    const { rows, unknownColumns } = parseQwasarProgressCsv(text);
    expect(rows[0].track).toBe("Some Future Track");
    expect(unknownColumns).toContain("Some Future Track");
  });

  it("skips rows without a login and counts skipped cells", () => {
    const text = `${QWASAR_HEADER}\n1,A B,,active,a@x.org,2026-01-01,C1,50,,\n2,C D,cd,active,c@x.org,2026-01-01,C1,notanumber,,`;
    const { rows, skippedCells } = parseQwasarProgressCsv(text);
    expect(rows).toEqual([]);
    expect(skippedCells).toBeGreaterThan(0);
  });

  it("rejects a CSV missing the Login column", () => {
    const { error } = parseQwasarProgressCsv("Name,Status\nA,active");
    expect(error).toMatch(/Login/);
  });
});

describe("parseUsernameMappingCsv", () => {
  it("parses name,email,login,status rows and lowercases emails", () => {
    const { rows } = parseUsernameMappingCsv(
      "name,email,login,status\nJanis Vedla,Janis.Vedla@startschool.org,vedla_j,graduate"
    );
    expect(rows).toEqual([
      {
        email: "janis.vedla@startschool.org",
        login: "vedla_j",
        status: "graduate",
      },
    ]);
  });

  it("rejects missing headers", () => {
    const { error } = parseUsernameMappingCsv("email\na@b.c");
    expect(error).toMatch(/login/i);
  });
});
