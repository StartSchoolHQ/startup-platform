/**
 * /full-scholarship-agreement
 *
 * Public landing for students assigned to the Full Tuition Scholarship.
 * The route is intentionally hidden — admins forward the URL via email
 * to vetted students. Middleware adds X-Robots-Tag and Referrer-Policy.
 */
import { PublicAgreementCard } from "@/components/scholarship/PublicAgreementCard";

export const dynamic = "force-dynamic";

export default function FullScholarshipAgreementPage() {
  return <PublicAgreementCard agreementType="full" />;
}
