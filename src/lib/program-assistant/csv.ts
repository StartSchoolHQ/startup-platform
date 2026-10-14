import type { ImportSummary, SnapshotRow } from "./types";

/**
 * Qwasar progress export → snapshot rows. Pure functions, no I/O.
 *
 * Rules carried over from the Cowork `/qwasar-progress` skill:
 * - columns are read by name, never by position;
 * - `Onboarding` is ignored (the track is broken on Qwasar's side);
 * - only `Status = active` rows of the current cohort are kept;
 * - one row per student × module that has a value, plus a `Preseason Web`
 *   row for every student (0 when empty) so each student exists on the date.
 */

export const REQUIRED_COLUMNS = [
  "User ID",
  "Name",
  "Login",
  "Status",
  "Email",
  "Last Login",
  "Cohort Name",
  "Preseason Web",
  "Preseason Data",
  "Season 01 Arc 01",
  "Season 02 Fullstack",
] as const;

/** Columns that are not progress modules; everything after `Cohort Name` is. */
const NON_MODULE_COLUMNS = new Set<string>([
  "User ID",
  "Name",
  "Login",
  "Status",
  "Email",
  "Last Login",
  "Cohort Name",
]);

const IGNORED_MODULES = new Set(["Onboarding"]);

/** Minimal RFC 4180 parser: quotes, doubled quotes, CR/LF, UTF-8 BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function csvToRecords(text: string): {
  header: string[];
  records: Record<string, string>[];
} {
  const rows = parseCsv(text);
  if (rows.length === 0) return { header: [], records: [] };
  const header = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => {
      rec[h] = (r[i] ?? "").trim();
    });
    return rec;
  });
  return { header, records };
}

export function missingColumns(header: string[]): string[] {
  const have = new Set(header);
  return REQUIRED_COLUMNS.filter((c) => !have.has(c));
}

/** True when the body looks like an HTML page (login form) rather than CSV. */
export function looksLikeHtml(text: string): boolean {
  return /^\s*(<!doctype html|<html|<head|<body)/i.test(text.slice(0, 500));
}

/**
 * Qwasar writes `YYYY-MM-DD HH:MM:SS UTC` (the skill took the first 19
 * characters). Returns an ISO string in UTC or null for empty / unparseable.
 */
export function parseLastLogin(value: string): string | null {
  const m = value
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

export function parsePercent(value: string): number {
  const n = Number.parseInt(value.replace("%", "").trim(), 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function moduleColumns(header: string[]): string[] {
  return header.filter(
    (h) => h && !NON_MODULE_COLUMNS.has(h) && !IGNORED_MODULES.has(h)
  );
}

export interface SnapshotBuild {
  rows: SnapshotRow[];
  summary: ImportSummary;
}

/**
 * Keeps active students of the cohort and expands them into snapshot rows.
 * `cohortPrefix` is matched with `startsWith` like the skill did.
 */
export function buildSnapshotRows(
  header: string[],
  records: Record<string, string>[],
  cohortPrefix: string
): SnapshotBuild {
  const modules = moduleColumns(header);
  const rows: SnapshotRow[] = [];
  let activeRows = 0;
  let cohortRows = 0;
  const students = new Set<number>();
  const seenModules = new Set<string>();

  for (const r of records) {
    const active = r["Status"].toLowerCase() === "active";
    const inCohort = r["Cohort Name"].startsWith(cohortPrefix);
    if (active) activeRows++;
    if (inCohort) cohortRows++;
    if (!active || !inCohort) continue;
    const id = Number.parseInt(r["User ID"], 10);
    if (!Number.isFinite(id)) continue;
    students.add(id);
    const base = {
      qwasar_user_id: id,
      login: r["Login"],
      name: r["Name"],
      email: r["Email"].toLowerCase(),
      status: r["Status"].toLowerCase(),
      cohort: r["Cohort Name"],
      last_login_at: parseLastLogin(r["Last Login"] ?? ""),
    };
    let wrotePreseasonWeb = false;
    for (const m of modules) {
      const raw = r[m] ?? "";
      if (raw === "" && m !== "Preseason Web") continue;
      rows.push({ ...base, module: m, percent: parsePercent(raw) });
      seenModules.add(m);
      if (m === "Preseason Web") wrotePreseasonWeb = true;
    }
    if (!wrotePreseasonWeb) {
      rows.push({ ...base, module: "Preseason Web", percent: 0 });
      seenModules.add("Preseason Web");
    }
  }

  return {
    rows,
    summary: {
      totalRows: records.length,
      activeRows,
      cohortRows,
      students: students.size,
      snapshotRows: rows.length,
      modules: [...seenModules].sort(),
    },
  };
}
