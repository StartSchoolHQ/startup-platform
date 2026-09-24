import type { Database } from "@/types/database";

/** One row of `get_analytics_attention_v1`. */
export type AttentionRow =
  Database["public"]["Functions"]["get_analytics_attention_v1"]["Returns"][number];

export type SeverityTone = "negative" | "warning" | "neutral";

/** Severity = number of triggered rules, inactivity counted twice. */
export function severityTone(severity: number): SeverityTone {
  if (severity >= 4) return "negative";
  if (severity >= 2) return "warning";
  return "neutral";
}

/** Rows with an active dismissal fold away from the main list. */
export function splitDismissed(rows: AttentionRow[]): {
  open: AttentionRow[];
  dismissed: AttentionRow[];
} {
  const open: AttentionRow[] = [];
  const dismissed: AttentionRow[] = [];
  for (const r of rows) (r.dismissed_until ? dismissed : open).push(r);
  return { open, dismissed };
}
