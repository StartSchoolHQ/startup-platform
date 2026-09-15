/**
 * Route classification for the auth middleware.
 *
 * `/` is public by exact match only — a `startsWith("/")` check would make
 * every path public (the bug this module replaces). Everything else is a
 * prefix match.
 */
const PUBLIC_PREFIXES = [
  "/login",
  "/auth/",
  "/profile/setup",
  "/policy",
  "/terms",
  "/full-scholarship-agreement",
  "/partial-scholarship-agreement",
  "/part-time-agreement",
  "/laptop-agreement",
  "/keycard-agreement",
  "/agreement/",
  "/privacy/scholarship-agreement",
];

/** Hidden scholarship pages + privacy notice: noindex + no-referrer. */
const SCHOLARSHIP_NOINDEX_PREFIXES = [
  "/full-scholarship-agreement",
  "/partial-scholarship-agreement",
  "/part-time-agreement",
  "/laptop-agreement",
  "/keycard-agreement",
  "/agreement/",
  "/privacy/scholarship-agreement",
];

const PROTECTED_PREFIXES = ["/dashboard"];

export interface RouteClass {
  isPublic: boolean;
  isProtected: boolean;
  isScholarshipPublic: boolean;
}

export function classifyRoute(pathname: string): RouteClass {
  const isPublic =
    pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isScholarshipPublic = SCHOLARSHIP_NOINDEX_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );
  return { isPublic, isProtected, isScholarshipPublic };
}
