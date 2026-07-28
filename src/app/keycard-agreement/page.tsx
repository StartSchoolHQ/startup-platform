/**
 * /keycard-agreement
 *
 * Public landing for students receiving a Startup House key card (Key Card
 * Agreement). The route is intentionally hidden — admins forward the URL
 * via email. Middleware adds X-Robots-Tag and Referrer-Policy.
 */
import { PublicAgreementCard } from "@/components/scholarship/PublicAgreementCard";

export const dynamic = "force-dynamic";

export default function KeycardAgreementPage() {
  return <PublicAgreementCard agreementType="keycard" />;
}
