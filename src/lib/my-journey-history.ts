/**
 * Normalises `task_progress.submission_history` of a recurring solo task into
 * one list the History tab can render, newest first.
 *
 * Two writers append to that column with different shapes:
 * - cron job 4 (`reset_available_recurring_tasks`) archives a finished cycle:
 *   `{ submission_data, completed_at, review_feedback, points_awarded, status }`
 * - `submit_individual_task_v1` archives the attempt being replaced on a
 *   resubmit: `{ submission_data, submitted_at, status }` (usually rejected)
 *
 * The row's live submission (the cycle in progress or just finished) is
 * folded in as the newest entry so the student sees the whole arc.
 */

import { normalizeSubmission } from "@/lib/ai-review/normalize";
import type { NormalizedFile, NormalizedLink } from "@/lib/ai-review/types";

export interface HistoryEntry {
  /** 1-based, oldest cycle first; null for a rejected attempt. */
  cycle: number | null;
  kind: "cycle" | "attempt" | "current";
  status: string;
  date: string | null;
  description: string;
  links: NormalizedLink[];
  files: NormalizedFile[];
  feedback: string | null;
  points: number | null;
}

interface RawEntry {
  submission_data?: unknown;
  completed_at?: string | null;
  submitted_at?: string | null;
  review_feedback?: string | null;
  points_awarded?: number | null;
  status?: string | null;
}

export interface CurrentSubmission {
  submission_data?: unknown;
  status?: string | null;
  completed_at?: string | null;
  review_feedback?: string | null;
}

function toEntry(raw: RawEntry, kind: HistoryEntry["kind"]): HistoryEntry {
  const body = normalizeSubmission(raw.submission_data);
  return {
    cycle: null,
    kind,
    status: raw.status ?? "unknown",
    date: raw.completed_at ?? raw.submitted_at ?? null,
    description: body.description,
    links: body.links,
    files: body.files,
    feedback: raw.review_feedback ?? null,
    points: raw.points_awarded ?? null,
  };
}

const time = (value: string | null) => (value ? Date.parse(value) || 0 : 0);

/**
 * Builds the list. `current` is the row's own submission; it is included when
 * something was actually submitted this cycle (approved, waiting for review,
 * or rejected and not yet resubmitted).
 */
export function buildSubmissionHistory(
  history: unknown,
  current?: CurrentSubmission | null
): HistoryEntry[] {
  const raw: RawEntry[] = Array.isArray(history)
    ? history.filter(
        (e): e is RawEntry => !!e && typeof e === "object" && !Array.isArray(e)
      )
    : [];

  const entries = raw.map((e) =>
    toEntry(e, e.status === "approved" ? "cycle" : "attempt")
  );

  if (
    current?.submission_data &&
    ["approved", "pending_review", "rejected", "revision_required"].includes(
      current.status ?? ""
    )
  ) {
    entries.push(
      toEntry(
        {
          submission_data: current.submission_data,
          completed_at: current.completed_at ?? null,
          review_feedback: current.review_feedback ?? null,
          status: current.status ?? null,
        },
        "current"
      )
    );
  }

  // Oldest first to number the finished cycles, then flip for display.
  entries.sort((a, b) => time(a.date) - time(b.date));
  let cycle = 0;
  for (const entry of entries) {
    if (entry.status === "approved") entry.cycle = ++cycle;
  }
  return entries.reverse();
}
