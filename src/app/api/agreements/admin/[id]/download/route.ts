/**
 * GET /api/agreements/admin/[id]/download
 *
 * Returns a short-lived (60s) signed URL for the final .edoc in the
 * private `scholarship-documents` bucket. The admin clicks the link to
 * download. Storage access goes through the admin client because the
 * bucket has no public read policies.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scholarship/auth";
import { findById } from "@/lib/scholarship/data";
import { createAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "scholarship-documents";
const SIGNED_URL_TTL_SECONDS = 60;

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
  if (!agreement.signed_doc_path) {
    return NextResponse.json({ error: "no_signed_doc" }, { status: 409 });
  }

  const supa = createAdminClient();
  const { data, error } = await supa.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(agreement.signed_doc_path, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    return NextResponse.json({ error: "signed_url_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
