/**
 * /privacy/scholarship-agreement
 *
 * Public Art. 13 privacy notice linked from the scholarship form pages.
 * Marked noindex via the route's layout and via the X-Robots-Tag header
 * added by `src/lib/supabase/middleware.ts`.
 */
import { PrivacyNoticeFull } from "@/components/scholarship/PrivacyNoticeFull";

export const dynamic = "force-static";

export default function ScholarshipPrivacyNoticePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <PrivacyNoticeFull />
    </main>
  );
}
