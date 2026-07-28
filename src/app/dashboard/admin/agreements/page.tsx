/**
 * /dashboard/admin/agreements
 *
 * Admin queue for the scholarship agreement types (full / partial /
 * part-time). Equipment agreements (laptop / key card) live on their own
 * queue at /dashboard/admin/laptops-keycards. All behaviour is in the
 * shared AgreementsQueue component.
 */
import { AgreementsQueue } from "@/components/scholarship/AgreementsQueue";

export default function AdminAgreementsPage() {
  return (
    <AgreementsQueue
      title="Scholarship agreements"
      description="Review student submissions and countersign as the school."
      types={["full", "partial", "part_time"]}
      emptyMessage="No agreements yet. Share /full-scholarship-agreement or /partial-scholarship-agreement with students to get started."
    />
  );
}
