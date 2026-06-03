/**
 * POST /api/agreements/admin/[id]/retry
 *
 * Recovery for rows stuck at `identity_verified` (PDF render failed) or
 * `failed`. Clears partial Dokobit signing state, returns the row to
 * `identity_verified`, and re-runs the PDF + signing-create flow via the
 * complete-identity helper.
 *
 * 409 if the row isn't in a retryable state or has no Dokobit auth token.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scholarship/auth";
import { completeIdentityAndCreateSigning } from "@/lib/scholarship/complete-identity";
import { findById, recordEvent, resetForRetry } from "@/lib/scholarship/data";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RETRYABLE = new Set(["identity_verified", "failed"]);

export async function POST(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const agreement = await findById(id);

  if (!RETRYABLE.has(agreement.status)) {
    return NextResponse.json(
      { error: `cannot_retry_from_${agreement.status}` },
      { status: 409 }
    );
  }
  if (!agreement.dokobit_auth_token) {
    return NextResponse.json({ error: "no_auth_token" }, { status: 409 });
  }
  if (!agreement.callback_ref) {
    return NextResponse.json({ error: "no_callback_ref" }, { status: 409 });
  }

  try {
    // Reset clears partial signing state and bumps status back to
    // identity_verified so the helper's idempotency check doesn't
    // short-circuit on the old (now-invalid) signing_token.
    const reset = await resetForRetry(agreement.id);
    const origin = new URL(request.url).origin;

    const { signing_ui_url } = await completeIdentityAndCreateSigning({
      callback_ref: reset.callback_ref!,
      dokobit_return_token: reset.dokobit_auth_token!,
      origin,
    });

    return NextResponse.json({ ok: true, signing_ui_url });
  } catch (err) {
    await recordEvent({
      id: agreement.id,
      event_type: "error",
      payload: {
        stage: "retry",
        message: err instanceof Error ? err.message : String(err),
      },
    });
    return NextResponse.json({ error: "retry_failed" }, { status: 500 });
  }
}
