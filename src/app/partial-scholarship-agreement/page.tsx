/**
 * /partial-scholarship-agreement
 *
 * Public landing for students assigned to the Partial Tuition Scholarship
 * (60% covered; student pays €2000 in two instalments). Hidden route —
 * URL is forwarded by admin via email.
 */
import { PublicAgreementCard } from "@/components/scholarship/PublicAgreementCard";

export const dynamic = "force-dynamic";

export default function PartialScholarshipAgreementPage() {
  return <PublicAgreementCard agreementType="partial" />;
}
