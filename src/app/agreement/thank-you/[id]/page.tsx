/**
 * /agreement/thank-you/[id]
 *
 * Post-PIN2 confirmation for the student. Verifies the row has reached
 * a "student-signed-or-later" state before rendering — direct navigation
 * by an attacker who guessed an id can't reach this page unless the row
 * has actually progressed past student signing.
 */
import { notFound, redirect } from "next/navigation";
import { ThankYouCard } from "@/components/scholarship/ThankYouCard";
import { findById } from "@/lib/scholarship/data";
import type { Database } from "@/types/database";

type Status = Database["public"]["Enums"]["scholarship_agreement_status"];
type AgreementType = Database["public"]["Enums"]["scholarship_agreement_type"];

const STUDENT_DONE_STATUSES: ReadonlySet<Status> = new Set([
  "student_signed",
  "awaiting_school_signature",
  "school_signed",
  "archived",
]);

const PUBLIC_ROUTE: Partial<Record<AgreementType, string>> = {
  full: "/full-scholarship-agreement",
  partial: "/partial-scholarship-agreement",
  part_time: "/part-time-agreement",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function AgreementThankYouPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  let agreement;
  try {
    agreement = await findById(id);
  } catch {
    notFound();
  }

  if (!STUDENT_DONE_STATUSES.has(agreement.status)) {
    redirect(PUBLIC_ROUTE[agreement.agreement_type] ?? "/");
  }

  return <ThankYouCard firstName={agreement.signer_name} />;
}
