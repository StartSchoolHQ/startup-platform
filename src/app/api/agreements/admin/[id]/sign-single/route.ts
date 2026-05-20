/**
 * GET /api/agreements/admin/[id]/sign-single
 *
 * Returns the Dokobit hosted-UI URL that the admin opens to sign ONE
 * agreement (used when the admin's eID is Smart-ID — which can't batch).
 *
 * The row must be in `awaiting_school_signature` with both
 * dokobit_signing_token and dokobit_school_signer_token populated by the
 * student-signed webhook flow.
 */
import { NextResponse } from "next/server";
import { buildSigningUiUrl } from "@/lib/dokobit/signing";
import { requireAdmin } from "@/lib/scholarship/auth";
import { findById } from "@/lib/scholarship/data";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const agreement = await findById(id);

  if (agreement.status !== "awaiting_school_signature") {
    return NextResponse.json(
      { error: "not_awaiting_school_signature" },
      { status: 409 }
    );
  }

  if (
    !agreement.dokobit_signing_token ||
    !agreement.dokobit_school_signer_token
  ) {
    return NextResponse.json({ error: "missing_tokens" }, { status: 500 });
  }

  const url = buildSigningUiUrl(
    agreement.dokobit_signing_token,
    agreement.dokobit_school_signer_token
  );
  return NextResponse.json({ url });
}
