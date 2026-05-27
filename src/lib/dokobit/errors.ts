/**
 * Dokobit API error codes worth a specific user-facing message.
 *
 * Source: Dokobit "Error handling for Documents API and Identity API"
 * (https://dokobit.support.signicat.com/). The article calls out these
 * codes as ones that should drive specific UX; everything else gets the
 * generic "something went wrong, try again or contact support" treatment.
 *
 * These codes can surface in two shapes:
 *   1. A 200 response body with `{ status: "error", error_code, message }`
 *      — emitted by status endpoints (e.g. `getAuthStatus` after the
 *      student cancels at the Dokobit hosted UI).
 *   2. A non-2xx response whose body carries the same shape — surfaced
 *      to our code as `DokobitError.body`.
 *
 * `extractDokobitErrorCode` accepts either shape and returns the code
 * only when it matches one of the handled values.
 */

export type DokobitErrorCode = 6001 | 6005 | 6006 | 6007 | 6008 | 7023;

export const DOKOBIT_USER_MESSAGES: Record<DokobitErrorCode, string> = {
  6001: "Your phone is not registered for Mobile-ID. Please try a different signing method.",
  6005: "The signing session expired. Please start over.",
  6006: "You don't have a Smart-ID account. Please try a different signing method.",
  6007: "Your Smart-ID Basic account can't be used for document signing. Use a Smart-ID Qualified account.",
  6008: "Open the Smart-ID app or the self-service portal to complete account verification, then try again.",
  7023: "You cancelled the signing. You can start over when you're ready.",
};

const HANDLED_CODES: ReadonlySet<number> = new Set(
  Object.keys(DOKOBIT_USER_MESSAGES).map(Number)
);

export function extractDokobitErrorCode(
  payload: unknown
): DokobitErrorCode | null {
  if (typeof payload !== "object" || payload === null) return null;
  const code = (payload as { error_code?: unknown }).error_code;
  if (typeof code !== "number" || !HANDLED_CODES.has(code)) return null;
  return code as DokobitErrorCode;
}

export function userMessageForDokobitError(payload: unknown): string | null {
  const code = extractDokobitErrorCode(payload);
  return code === null ? null : DOKOBIT_USER_MESSAGES[code];
}
