/**
 * /dashboard/admin/laptops-keycards
 *
 * Admin queue for the equipment agreement types (laptop / key card),
 * separated from the scholarship queue so the board can countersign and
 * track hardware paperwork without it mixing into scholarship rows. All
 * behaviour is in the shared AgreementsQueue component.
 */
import { AgreementsQueue } from "@/components/scholarship/AgreementsQueue";

export default function AdminLaptopsKeycardsPage() {
  return (
    <AgreementsQueue
      title="Laptops & Key Cards"
      description="Review equipment agreements and countersign as the school."
      types={["laptop", "keycard"]}
      emptyMessage="No equipment agreements yet. Share /laptop-agreement or /keycard-agreement with students to get started."
    />
  );
}
