// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { isNoTrackRoute } from "@/lib/analytics/no-track-routes";

/**
 * Field names whose values must NEVER leave the browser via Sentry.
 * Scrubbed recursively from event payloads and breadcrumbs.
 *
 * The list is intentionally global — these field names are sensitive
 * everywhere in the app, not just on agreement routes. Anything that
 * pattern-matches one of these keys (case-insensitive) is replaced with
 * the literal string "[scrubbed]".
 */
const SCRUB_KEYS = new Set([
  "personal_code",
  "signer_personal_code",
  "email",
  "phone",
  "address",
  "name",
  "surname",
  "first_name",
  "last_name",
  "full_name",
]);

const SCRUB_PLACEHOLDER = "[scrubbed]";
const SCRUB_MAX_DEPTH = 8;

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > SCRUB_MAX_DEPTH) return value;
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SCRUB_KEYS.has(k.toLowerCase())
        ? SCRUB_PLACEHOLDER
        : scrubValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

// Initialize Sentry
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  beforeSend(event) {
    // Recursively scrub known-sensitive keys from the entire event tree.
    // Covers extra, contexts, request data, tags, user, etc.
    return scrubValue(event) as Sentry.ErrorEvent;
  },

  beforeBreadcrumb(breadcrumb) {
    // Same scrubbing applied to breadcrumb data so PII can't sneak in via
    // a `fetch` breadcrumb or a console.log.
    if (breadcrumb.data) {
      breadcrumb.data = scrubValue(breadcrumb.data) as typeof breadcrumb.data;
    }
    return breadcrumb;
  },
});

// Initialize PostHog (skip in local dev to avoid fetch errors)
if (process.env.NODE_ENV === "production") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    // Include the defaults option as required by PostHog
    defaults: "2025-11-30",
    // Enables capturing unhandled exceptions via Error Tracking
    capture_exceptions: true,
    // Only track identified users (reduces noise)
    person_profiles: "identified_only",
  });

  // First-load opt-out: if the user lands directly on a no-track route
  // (e.g. emailed link to /full-scholarship-agreement), silence PostHog
  // immediately. PostHogRouteGate handles subsequent navigation.
  if (
    typeof window !== "undefined" &&
    isNoTrackRoute(window.location.pathname)
  ) {
    posthog.opt_out_capturing();
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
