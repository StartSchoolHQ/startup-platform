"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isNoTrackRoute } from "@/lib/analytics/no-track-routes";

/**
 * Hotjar loader, gated by route. Returns null on scholarship-agreement
 * routes (and any other entry in NO_TRACK_PREFIXES) so session-recording
 * never captures the eID flow or signed-contract PII.
 *
 * Also gated by NODE_ENV and NEXT_PUBLIC_HOTJAR_SCRIPT_URL — matches the
 * pre-existing inline-script behavior in app/layout.tsx.
 */
export function HotjarScript() {
  const pathname = usePathname();

  if (process.env.NODE_ENV !== "production") return null;
  if (!process.env.NEXT_PUBLIC_HOTJAR_SCRIPT_URL) return null;
  if (isNoTrackRoute(pathname ?? "")) return null;

  return (
    <Script
      id="hotjar"
      src={process.env.NEXT_PUBLIC_HOTJAR_SCRIPT_URL}
      strategy="afterInteractive"
    />
  );
}
