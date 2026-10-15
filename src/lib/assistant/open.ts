/**
 * Lets any page open the Startie widget with a prepared question, without
 * the page knowing where the widget is mounted. The widget (mounted once in
 * the dashboard shell) listens for this event; the page only dispatches it.
 * Client-only: there is no window on the server.
 */
export const STARTIE_OPEN_EVENT = "startie:open";

export type StartieOpenSource = "review_feedback";

export interface StartieOpenDetail {
  /** Text placed in the composer, replacing any unsent draft. Not sent. */
  draft?: string;
  source: StartieOpenSource;
}

export function openStartie(detail: StartieOpenDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<StartieOpenDetail>(STARTIE_OPEN_EVENT, { detail })
  );
}

const MAX_CHECKS = 6;

/**
 * The question preloaded by "Ask Startie about this feedback". It names the
 * task, the attempt and the failed checks so the student can just press
 * send; the server adds the full review to the page block anyway, so the
 * check labels here are for the student's eyes, not Startie's.
 */
export function reviewFeedbackDraft(input: {
  title: string;
  attempt: number;
  failedChecks: string[];
}): string {
  const checks = input.failedChecks
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, MAX_CHECKS);
  const attempt = input.attempt > 1 ? ` (attempt ${input.attempt})` : "";
  const lines = [`My submission for "${input.title}" didn't pass${attempt}.`];
  if (checks.length) {
    lines.push(`Failed checks: ${checks.join("; ")}.`);
  }
  lines.push("What exactly is missing, and what evidence should I add?");
  return lines.join("\n");
}
