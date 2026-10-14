import type { ExplainInputRow, ExplanationRecord } from "./explain";

/**
 * The morning digest for #ops (spec §5.3 step 6). Built every run and stored
 * on `program.run.slack_message`; posted only when `slack_enabled` is true
 * (posting is phase 3b, the text exists from day one so it can be reviewed).
 */

export interface SlackDigestInput {
  snapshotDate: string;
  rows: ExplainInputRow[];
  explanations: ExplanationRecord[];
  dataIssues: number;
  pageUrl: string;
  maxTalkTo?: number;
}

function count(rows: ExplainInputRow[], status: string): number {
  return rows.filter((r) => r.status === status).length;
}

function byTrack(rows: ExplainInputRow[], status: string): string {
  const fs = rows.filter(
    (r) => r.status === status && (r.track ?? "FS") !== "ML"
  ).length;
  const ml = rows.filter((r) => r.status === status && r.track === "ML").length;
  return `FS ${fs} · ML ${ml}`;
}

export function buildSlackDigest(input: SlackDigestInput): string {
  const { rows, snapshotDate } = input;
  const tracked = rows.filter((r) => r.status !== "Not tracked");
  const week = tracked.find((r) => r.week != null)?.week;
  const lines: string[] = [];
  lines.push(
    `*Qwasar pace check · ${snapshotDate}${week != null ? ` · week ${week}` : ""}*`
  );
  lines.push(
    `Talk to ${count(rows, "Talk to")} (${byTrack(rows, "Talk to")}) · Watch ${count(rows, "Watch")} (${byTrack(rows, "Watch")}) · On pace ${count(rows, "On pace")} · Not tracked ${count(rows, "Not tracked")}`
  );
  const never = tracked.filter((r) => r.days_since_login == null).length;
  if (never > 0) lines.push(`Never logged in: ${never}`);

  const explained = new Map(
    input.explanations.map((e) => [e.qwasar_user_id, e])
  );
  const talk = rows
    .filter((r) => r.status === "Talk to")
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  if (talk.length > 0) {
    lines.push("");
    lines.push("*Talk to this week*");
    const max = input.maxTalkTo ?? 15;
    for (const r of talk.slice(0, max)) {
      const why = explained.get(r.qwasar_user_id)?.line ?? r.reason ?? "";
      lines.push(`• ${r.name ?? r.qwasar_user_id} — ${why}`);
    }
    if (talk.length > max) lines.push(`• … and ${talk.length - max} more`);
  }

  const notEvaluated = tracked.filter((r) => r.not_evaluated_reason).length;
  if (notEvaluated > 0) {
    const reason = tracked.find(
      (r) => r.not_evaluated_reason
    )!.not_evaluated_reason;
    lines.push("");
    lines.push(
      `_${reason}: pace bars not applied to ${notEvaluated} students._`
    );
  }
  if (input.dataIssues > 0) {
    lines.push(`Data to fix: ${input.dataIssues}`);
  }
  lines.push("");
  lines.push(`Details: ${input.pageUrl}`);
  return lines.join("\n");
}
