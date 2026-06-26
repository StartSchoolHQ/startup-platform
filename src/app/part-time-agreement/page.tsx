/**
 * /part-time-agreement
 *
 * Public landing for students joining the part-time studies program (they
 * pay tuition — this is not a scholarship). The route is intentionally
 * hidden — admins forward the URL via email to vetted students. Middleware
 * adds X-Robots-Tag and Referrer-Policy.
 */
import { PublicAgreementCard } from "@/components/scholarship/PublicAgreementCard";

export const dynamic = "force-dynamic";

export default function PartTimeAgreementPage() {
  return <PublicAgreementCard agreementType="part_time" />;
}
