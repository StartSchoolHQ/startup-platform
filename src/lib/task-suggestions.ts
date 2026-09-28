export const SUGGESTION_DAILY_LIMIT = 5;
export const SUGGESTION_TITLE_MIN = 5;
export const SUGGESTION_TITLE_MAX = 80;
export const SUGGESTION_DESCRIPTION_MIN = 10;
export const SUGGESTION_DESCRIPTION_MAX = 300;

/**
 * Real tasks from the My Journey library (MJ-P1-07, MJ-P2-04), shown next to
 * the suggest form so students copy the house style: verb first, one
 * outcome, one or two sentences on what they do and why.
 */
export const SUGGESTION_EXAMPLES: { title: string; description: string }[] = [
  {
    title:
      "Write a one-sentence problem statement without mentioning a solution",
    description:
      "Describe a real problem in one sentence, with zero mention of how you'd solve it.",
  },
  {
    title: "Cold-message 5 potential users you don't know",
    description:
      "Reach out to 5 strangers who might have the problem you're exploring, and ask to talk.",
  },
];

export const SUGGESTION_LIMIT_MESSAGE =
  "You've suggested 5 tasks today — come back tomorrow.";

const MESSAGES: Record<string, string> = {
  SUGGESTION_LIMIT_REACHED: SUGGESTION_LIMIT_MESSAGE,
  INVALID_PHASE: "Pick a phase from the list.",
  INVALID_TITLE: `Title must be ${SUGGESTION_TITLE_MIN}–${SUGGESTION_TITLE_MAX} characters.`,
  INVALID_DESCRIPTION: `Description must be ${SUGGESTION_DESCRIPTION_MIN}–${SUGGESTION_DESCRIPTION_MAX} characters.`,
  NOT_AUTHENTICATED: "Your session expired. Sign in again and retry.",
};

/** Turns a suggest_task_v1 error into the sentence the student sees. */
export function mapSuggestTaskError(
  error: { message?: string } | null | undefined
): string {
  const message = error?.message ?? "";
  const key = Object.keys(MESSAGES).find((k) => message.includes(k));
  return key
    ? MESSAGES[key]
    : "Couldn't send the suggestion. Please try again.";
}
