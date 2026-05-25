"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { isNoTrackRoute } from "@/lib/analytics/no-track-routes";

/**
 * Per-route PostHog gate.
 *
 * PostHog is initialised once in `instrumentation-client.ts` at app boot.
 * That gives us the first-load opt-out only. This component handles
 * client-side navigation between tracked and excluded routes by toggling
 * `opt_in_capturing` / `opt_out_capturing` on every pathname change.
 *
 * Belt + suspenders: even if PostHog was inited before the user lands on
 * a scholarship-agreement route, this will silence it before any event
 * fires.
 *
 * Renders nothing.
 */
export function PostHogRouteGate() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!posthog || typeof posthog.opt_in_capturing !== "function") return;

    if (isNoTrackRoute(pathname ?? "")) {
      posthog.opt_out_capturing();
    } else {
      posthog.opt_in_capturing();
    }
  }, [pathname]);

  return null;
}
