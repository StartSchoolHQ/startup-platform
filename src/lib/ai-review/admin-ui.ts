/** Shared display helpers for the admin AI reviews table + detail dialog. */
export const AI_REVIEW_OUTCOME_STYLES: Record<string, string> = {
  approved:
    "bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400",
  rejected:
    "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400",
  failed:
    "bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/20 dark:text-red-400",
  queued:
    "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400",
  running:
    "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400",
};

/** `ai_task_reviews.decided_by` → admin-facing label. */
export const AI_REVIEW_DECIDED_BY_LABELS: Record<string, string> = {
  ai: "AI",
  system: "System",
  auto_approve_fallback: "Auto-approved (AI off)",
  self_check: "Self-check",
};

export const AI_REVIEW_REJECT_REASONS = [
  { value: "criteria", label: "Criteria not met" },
  { value: "low_confidence", label: "Low confidence" },
  { value: "unverifiable_evidence", label: "Unverifiable evidence" },
  { value: "technical_failure", label: "Technical failure" },
];

export function relativeDate(date: string | null): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function formatFullDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
