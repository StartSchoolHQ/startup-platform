/**
 * GET /api/agreements/admin
 *
 * Lists scholarship agreements for the admin queue page.
 * Optional filters via query string:
 *   ?status=...     (scholarship_agreement_status enum value)
 *   ?type=...       (full|partial)
 *   ?q=...          (substring match across recipient_email,
 *                    signer_name, signer_surname — case-insensitive)
 *
 * Returns 404 to non-admins (uniform with all other admin endpoints to
 * avoid leaking that the route exists).
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scholarship/auth";
import {
  listAgreements,
  type ListAgreementsFilters,
} from "@/lib/scholarship/data";
import type { Database } from "@/types/database";

type Status = Database["public"]["Enums"]["scholarship_agreement_status"];
type AgreementType = Database["public"]["Enums"]["scholarship_agreement_type"];

const ALLOWED_STATUSES: ReadonlySet<Status> = new Set([
  "draft",
  "identity_verified",
  "awaiting_student_signature",
  "student_signed",
  "awaiting_school_signature",
  "school_signed",
  "archived",
  "cancelled",
  "expired",
  "failed",
]);

const ALLOWED_TYPES: ReadonlySet<AgreementType> = new Set(["full", "partial"]);

function parseFilters(url: URL): ListAgreementsFilters {
  const filters: ListAgreementsFilters = {};
  const statusParam = url.searchParams.get("status");
  if (statusParam && ALLOWED_STATUSES.has(statusParam as Status)) {
    filters.status = statusParam as Status;
  }
  const typeParam = url.searchParams.get("type");
  if (typeParam && ALLOWED_TYPES.has(typeParam as AgreementType)) {
    filters.agreement_type = typeParam as AgreementType;
  }
  const search = url.searchParams.get("q");
  if (search) filters.search = search;
  return filters;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filters = parseFilters(new URL(request.url));
  const data = await listAgreements(filters);
  return NextResponse.json({ data });
}
