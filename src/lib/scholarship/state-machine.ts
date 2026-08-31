/**
 * Scholarship-agreement state machine.
 *
 * Mirrors the server-side enforcement in the SECURITY DEFINER RPCs (the
 * RPCs use `WHERE status = '...'` guards on their UPDATEs). This module is
 * the authoritative reference for the allowed transitions on the client
 * side — UI uses it to decide which action buttons to show.
 *
 * The status enum is generated from the Postgres `scholarship_agreement_status`
 * type via `src/types/database.ts`, so adding a new status in SQL surfaces
 * a TypeScript error here until this map is updated.
 */
import type { Database } from "@/types/database";

export type ScholarshipStatus =
  Database["public"]["Enums"]["scholarship_agreement_status"];

const FORWARD: Record<ScholarshipStatus, ScholarshipStatus[]> = {
  draft: ["identity_verified"],
  identity_verified: ["awaiting_student_signature"],
  awaiting_student_signature: ["student_signed"],
  student_signed: ["awaiting_school_signature"],
  awaiting_school_signature: ["school_signed"],
  school_signed: ["archived"],
  // Post-signature student outcomes (scholarship_set_outcome_v1):
  // archived ⇄ dropped_out / terminated_by_school. The signed document
  // survives either way; the outcome statuses just exclude the student
  // from the "signed" (= active students) count.
  archived: ["dropped_out", "terminated_by_school"],
  dropped_out: ["archived"],
  terminated_by_school: ["archived"],
  cancelled: [],
  expired: [],
  failed: [],
};

/** archived + the post-signature outcome statuses that derive from it. */
const POST_SIGNED: ScholarshipStatus[] = [
  "archived",
  "dropped_out",
  "terminated_by_school",
];

const TERMINAL_FOR_EXPIRE: ScholarshipStatus[] = [
  "school_signed",
  "cancelled",
  "expired",
  ...POST_SIGNED,
];

const TERMINAL_FOR_FAILED: ScholarshipStatus[] = ["cancelled", ...POST_SIGNED];

/**
 * Whether a row in `from` status may legitimately transition to `to`.
 *
 * Special branches:
 *   - `cancelled` — allowed from anywhere except the post-signed states
 *     (archived / dropped_out / terminated_by_school are already final
 *     signed contracts).
 *   - `expired`   — allowed from any non-terminal pending state.
 *   - `failed`    — allowed from any non-post-signed, non-cancelled state.
 *   - Everything else follows the FORWARD map (linear happy path plus the
 *     archived ⇄ outcome loop).
 */
export function canTransition(
  from: ScholarshipStatus,
  to: ScholarshipStatus
): boolean {
  if (to === "cancelled") return !POST_SIGNED.includes(from);
  if (to === "expired") return !TERMINAL_FOR_EXPIRE.includes(from);
  if (to === "failed") return !TERMINAL_FOR_FAILED.includes(from);
  return FORWARD[from].includes(to);
}
