import type {
  DataIssue,
  DataIssueKind,
  SnapshotRow,
  StudentTrackRow,
} from "./types";

/**
 * Fail-closed checks and the "Data to fix" list. Pure functions.
 * Mirrors the issue rules of the Cowork skill's `build_dashboard.py`.
 */

export interface CohortCheck {
  ok: boolean;
  students: number;
  bounds: [number, number];
  message?: string;
}

export function checkCohortSize(
  students: number,
  bounds: [number, number]
): CohortCheck {
  const [lo, hi] = bounds;
  if (students >= lo && students <= hi) return { ok: true, students, bounds };
  return {
    ok: false,
    students,
    bounds,
    message: `cohort has ${students} active students, expected ${lo}–${hi}; the export is probably wrong`,
  };
}

/** Distinct students in the snapshot rows, with name for messages. */
function studentsOf(rows: SnapshotRow[]): Map<number, SnapshotRow> {
  const m = new Map<number, SnapshotRow>();
  for (const r of rows)
    if (!m.has(r.qwasar_user_id)) m.set(r.qwasar_user_id, r);
  return m;
}

export interface IssueBuild {
  issues: DataIssue[];
  unmapped: number;
  unmappedPct: number;
}

/**
 * - active in Qwasar, no `student_track` row → `active_no_track_row`
 * - sheet says Dropout / Will drop out / Terminated, Qwasar says active → `dropout_but_active`
 * - sheet says Active, student not active in the export → `import_warning`
 */
export function buildDataIssues(
  rows: SnapshotRow[],
  tracks: StudentTrackRow[]
): IssueBuild {
  const students = studentsOf(rows);
  const byId = new Map(tracks.map((t) => [t.qwasar_user_id, t]));
  const issues: DataIssue[] = [];
  let unmapped = 0;

  for (const [id, s] of students) {
    const t = byId.get(id);
    if (!t) {
      unmapped++;
      issues.push({
        qwasar_user_id: id,
        kind: "active_no_track_row",
        suggested_fix: suggestedFix("active_no_track_row"),
        detail: `${s.name} (${s.login}) is active in Qwasar but has no row in student_track; add them to the Student info sheet`,
      });
      continue;
    }
    const sheetStatus = (t.sheet_status ?? "Active").trim();
    if (sheetStatus.toLowerCase() !== "active") {
      issues.push({
        qwasar_user_id: id,
        kind: "dropout_but_active",
        suggested_fix: suggestedFix("dropout_but_active"),
        detail: `sheet says "${sheetStatus}", Qwasar says active (${s.name}); deactivate on Qwasar or fix the sheet`,
      });
    }
  }

  for (const t of tracks) {
    const sheetStatus = (t.sheet_status ?? "Active").trim().toLowerCase();
    if (sheetStatus === "active" && !students.has(t.qwasar_user_id)) {
      issues.push({
        qwasar_user_id: t.qwasar_user_id,
        kind: "import_warning",
        suggested_fix: suggestedFix("import_warning"),
        detail: `${t.name ?? t.qwasar_user_id} is Active in the sheet but not active in the Qwasar export`,
      });
    }
  }

  const total = students.size;
  const unmappedPct = total === 0 ? 0 : (unmapped / total) * 100;
  return { issues, unmapped, unmappedPct: Math.round(unmappedPct * 10) / 10 };
}

/**
 * Deterministic fix per issue kind. The spec had Claude propose these, but
 * the issue text carries student names and the model must never see names;
 * the fixes are the same per kind anyway.
 */
export function suggestedFix(kind: DataIssueKind): string {
  switch (kind) {
    case "active_no_track_row":
      return "Add the student to the Student info sheet (org email, Tech Track, Study type). The next run's track sync picks them up.";
    case "dropout_but_active":
      return "If they really left, deactivate the account on Qwasar; if they are back, set the sheet status to Active.";
    case "import_warning":
      return "Check Qwasar: the student is Active in the sheet but missing or inactive in the export. Fix whichever side is wrong.";
    case "wrong_track":
      return "Compare the sheet's Tech Track with the modules the student actually works on in Qwasar and correct the sheet.";
    case "unmapped_student":
      return "Add a row for this student to the Student info sheet so the run can map them.";
    case "attendance_unmatched_email":
      return "The attendance sheet uses an email that does not match the roster; align the email in the roster or the absence log.";
  }
}
