// Qwasar CSV parsing. ALWAYS by header name, never column index — the track
// column set grows over time. Empty track cell means "never enrolled" and
// must NOT become a row (0 is a real value: enrolled, no progress).

import { csvParse } from "d3-dsv";
import { KNOWN_TRACK_COLUMNS } from "./constants";
import type { QwasarProgressRow } from "./types";

/** Non-track metadata columns in the Qwasar progress export. */
const METADATA_COLUMNS = new Set([
  "User ID",
  "Name",
  "Login",
  "Status",
  "Email",
  "Last Login",
  "Cohort Name",
]);

export interface QwasarProgressParseResult {
  rows: QwasarProgressRow[];
  unknownColumns: string[];
  skippedCells: number;
  error?: string;
}

export function parseQwasarProgressCsv(
  text: string
): QwasarProgressParseResult {
  const parsed = csvParse(text.replace(/^﻿/, ""));
  const columns = parsed.columns ?? [];

  for (const required of ["Login", "Cohort Name", "Status"]) {
    if (!columns.includes(required)) {
      return {
        rows: [],
        unknownColumns: [],
        skippedCells: 0,
        error: `CSV is missing the "${required}" column — is this the Qwasar progress export?`,
      };
    }
  }

  const trackColumns = columns.filter((c) => !METADATA_COLUMNS.has(c));
  const known = new Set<string>(KNOWN_TRACK_COLUMNS);
  const unknownColumns = trackColumns.filter((c) => !known.has(c));

  const rows: QwasarProgressRow[] = [];
  let skippedCells = 0;

  for (const record of parsed) {
    const login = (record["Login"] ?? "").trim();
    if (!login) {
      skippedCells += trackColumns.length;
      continue;
    }
    for (const track of trackColumns) {
      const cell = (record[track] ?? "").trim();
      if (cell === "") continue; // never enrolled — no row
      const percent = Number(cell);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        skippedCells += 1;
        continue;
      }
      rows.push({
        qwasar_login: login,
        track,
        percent: Math.round(percent),
        cohort: (record["Cohort Name"] ?? "").trim(),
        qwasar_status: (record["Status"] ?? "").trim(),
      });
    }
  }

  return { rows, unknownColumns, skippedCells };
}

export interface UsernameMappingParseResult {
  rows: { email: string; login: string; status: string }[];
  error?: string;
}

export function parseUsernameMappingCsv(
  text: string
): UsernameMappingParseResult {
  const parsed = csvParse(text.replace(/^﻿/, ""));
  const columns = (parsed.columns ?? []).map((c) => c.toLowerCase());

  for (const required of ["email", "login"]) {
    if (!columns.includes(required)) {
      return {
        rows: [],
        error: `CSV is missing the "${required}" column — expected headers: name,email,login,status`,
      };
    }
  }

  const rows = parsed
    .map((record) => ({
      email: (record["email"] ?? record["Email"] ?? "").trim().toLowerCase(),
      login: (record["login"] ?? record["Login"] ?? "").trim(),
      status: (record["status"] ?? record["Status"] ?? "").trim(),
    }))
    .filter((r) => r.email !== "" && r.login !== "");

  return { rows };
}
