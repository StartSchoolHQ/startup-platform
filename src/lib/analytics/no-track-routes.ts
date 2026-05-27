/**
 * Routes where third-party trackers (Hotjar session-recording, PostHog
 * product analytics) must NOT run. These pages collect sensitive personal
 * data (national ID via Dokobit eID, contact details, signed contract
 * PDFs) and are out of scope for product analytics.
 *
 * Consumed by:
 *   - `components/analytics/HotjarScript.tsx`     — skip injection client-side
 *   - `components/analytics/PostHogRouteGate.tsx` — opt out per route change
 *   - `instrumentation-client.ts`                 — opt out on first-load
 *   - `lib/supabase/middleware.ts`                — noindex + no-referrer
 *
 * Prefix-match, not exact, so `/agreement/identity-callback`,
 * `/agreement/thank-you/:id`, etc. are all covered.
 */
export const NO_TRACK_PREFIXES = [
  "/full-scholarship-agreement",
  "/partial-scholarship-agreement",
  "/agreement/",
  "/privacy/scholarship-agreement",
] as const;

export function isNoTrackRoute(pathname: string): boolean {
  return NO_TRACK_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
