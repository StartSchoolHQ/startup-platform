import { describe, expect, it } from "vitest";
import {
  buildSnapshotRows,
  csvToRecords,
  looksLikeHtml,
  missingColumns,
  moduleColumns,
  parseCsv,
  parseLastLogin,
  parsePercent,
} from "@/lib/program-assistant/csv";

const HEADER =
  "User ID,Name,Login,Status,Email,Last Login,Cohort Name,Onboarding,Preseason Web,Preseason Data,Season 01 Arc 01,Season 02 Fullstack,Season 02 Data Science";

function csv(rows: string[]): string {
  return [HEADER, ...rows].join("\r\n") + "\r\n";
}

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF and a BOM", () => {
    const out = parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n1,\r\n');
    expect(out).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
      ["1", ""],
    ]);
  });

  it("drops blank lines", () => {
    expect(parseCsv("a\n\nb\n")).toEqual([["a"], ["b"]]);
  });
});

describe("header validation", () => {
  it("accepts the real Qwasar header", () => {
    const { header } = csvToRecords(csv([]));
    expect(missingColumns(header)).toEqual([]);
  });

  it("names the missing columns", () => {
    expect(missingColumns(["User ID", "Name"])).toContain("Cohort Name");
  });

  it("treats everything after Cohort Name as a module except Onboarding", () => {
    const { header } = csvToRecords(csv([]));
    expect(moduleColumns(header)).toEqual([
      "Preseason Web",
      "Preseason Data",
      "Season 01 Arc 01",
      "Season 02 Fullstack",
      "Season 02 Data Science",
    ]);
  });

  it("recognises an HTML login page", () => {
    expect(looksLikeHtml("<!DOCTYPE html><html>")).toBe(true);
    expect(looksLikeHtml(HEADER)).toBe(false);
  });
});

describe("field parsing", () => {
  it("parses Qwasar's last-login format as UTC", () => {
    expect(parseLastLogin("2026-09-15 21:31:05 UTC")).toBe(
      "2026-09-15T21:31:05Z"
    );
    expect(parseLastLogin("")).toBeNull();
    expect(parseLastLogin("never")).toBeNull();
  });

  it("clamps percents", () => {
    expect(parsePercent("45")).toBe(45);
    expect(parsePercent("45%")).toBe(45);
    expect(parsePercent("")).toBe(0);
    expect(parsePercent("120")).toBe(100);
  });
});

describe("buildSnapshotRows", () => {
  const text = csv([
    "1,Ann A,ann_a,active,Ann@startschool.org,2026-10-13 08:00:00 UTC,Triffid Nebula - Andromeda,7,100,98,12,,",
    "2,Bob B,bob_b,active,bob@startschool.org,,Triffid Nebula - Andromeda,,50,,,,",
    "3,Cid C,cid_c,inactive,cid@startschool.org,,Triffid Nebula - Andromeda,,100,100,100,,",
    "4,Dee D,dee_d,active,dee@startschool.org,,Lagoon Nebula - Triangulum,,100,100,100,,",
    "5,Eve E,eve_e,active,eve@startschool.org,,Triffid Nebula - Andromeda,,,80,,,33",
  ]);

  it("keeps active rows of the cohort only", () => {
    const { header, records } = csvToRecords(text);
    const { rows, summary } = buildSnapshotRows(
      header,
      records,
      "Triffid Nebula"
    );
    expect(summary.totalRows).toBe(5);
    expect(summary.activeRows).toBe(4);
    expect(summary.cohortRows).toBe(4);
    expect(summary.students).toBe(3);
    const ids = new Set(rows.map((r) => r.qwasar_user_id));
    expect([...ids].sort()).toEqual([1, 2, 5]);
  });

  it("expands modules, ignores Onboarding and always writes Preseason Web", () => {
    const { header, records } = csvToRecords(text);
    const { rows } = buildSnapshotRows(header, records, "Triffid Nebula");
    const ann = rows.filter((r) => r.qwasar_user_id === 1);
    expect(ann.map((r) => `${r.module}=${r.percent}`)).toEqual([
      "Preseason Web=100",
      "Preseason Data=98",
      "Season 01 Arc 01=12",
    ]);
    expect(ann[0].email).toBe("ann@startschool.org");
    expect(ann[0].last_login_at).toBe("2026-10-13T08:00:00Z");

    const eve = rows.filter((r) => r.qwasar_user_id === 5);
    expect(eve.map((r) => `${r.module}=${r.percent}`)).toEqual([
      "Preseason Web=0",
      "Preseason Data=80",
      "Season 02 Data Science=33",
    ]);
    expect(eve[0].last_login_at).toBeNull();
    expect(rows.some((r) => r.module === "Onboarding")).toBe(false);
  });
});
