import type { ZodIssue } from "zod";

export type FieldErrors = Record<string, string>;

/**
 * Turns Zod issues into one message per top-level field, keeping the first
 * message for each. `["commitments", 0, "text"]` → key `commitments`; the
 * team schema's cross-field refine reports on `keyInsight`, so it lands on
 * that question. The forms render these inline instead of toasting.
 */
export function fieldErrorsFromIssues(issues: ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

/** First question (in the given order) that has an error, or null. */
export function firstErrorKey(
  errors: FieldErrors,
  order: readonly string[]
): string | null {
  return order.find((key) => key in errors) ?? null;
}
