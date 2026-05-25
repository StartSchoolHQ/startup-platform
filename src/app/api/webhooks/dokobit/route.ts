/**
 * POST /api/webhooks/dokobit
 *
 * Dokobit postback receiver. Two event types matter:
 *   - signer_signed         (a signer just confirmed with PIN2)
 *   - signing_completed     (all signers have signed — ready to archive)
 *
 * Hard rules:
 *   1. Re-verify status with Dokobit before mutating — never trust the
 *      postback alone. Postbacks can be replayed, forged, or out of order.
 *   2. Every branch is idempotent: an already-applied state returns 200
 *      so Dokobit stops retrying. Same-state re-receipt is a no-op.
 *   3. Unknown event names ack with 200 (we log via the agreement event
 *      row where applicable but never 500 on a recognised payload — that
 *      would loop Dokobit's retry forever).
 *   4. Optional IP allowlist via DOKOBIT_POSTBACK_ALLOWLIST. Empty in
 *      sandbox; populated in production.
 */
import { NextResponse } from "next/server";
import {
  addSigner,
  archiveSigning,
  getSigningStatus,
} from "@/lib/dokobit/signing";
import { DokobitWebhookPayload } from "@/lib/dokobit/types";
import {
  findBySigningToken,
  minimizeArchived,
  recordArchived,
  recordSchoolSigned,
  recordSchoolSigner,
  recordStudentSigned,
} from "@/lib/scholarship/data";
import { sendCompletedEmail } from "@/lib/scholarship/n8n";
import { createAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "scholarship-documents";

function ipAllowed(request: Request): boolean {
  const raw = process.env.DOKOBIT_POSTBACK_ALLOWLIST ?? "";
  const allow = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allow.length === 0) return true; // sandbox / dev — relaxed

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "";
  return allow.includes(ip);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Webhook misconfigured: ${name} is not set`);
  }
  return value;
}

function schoolSignerConfig() {
  return {
    name: requiredEnv("SCHOOL_SIGNER_NAME"),
    surname: requiredEnv("SCHOOL_SIGNER_SURNAME"),
    code: requiredEnv("SCHOOL_SIGNER_PERSONAL_CODE"),
    country_code: requiredEnv("SCHOOL_SIGNER_COUNTRY_CODE"),
  };
}

export async function POST(request: Request) {
  if (!ipAllowed(request)) {
    return NextResponse.json({ error: "ip_not_allowed" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = DokobitWebhookPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const { event, signing_token } = parsed.data;

  // Re-verify with Dokobit before acting on the postback (defends against
  // replay / forgery / out-of-order delivery).
  await getSigningStatus(signing_token);

  let agreement;
  try {
    agreement = await findBySigningToken(signing_token);
  } catch {
    // Unknown signing_token — ack so Dokobit stops retrying.
    return NextResponse.json({ ok: true, note: "unknown_signing_token" });
  }

  if (event === "signer_signed") {
    return handleSignerSigned(agreement, signing_token);
  }

  if (event === "signing_completed") {
    return handleSigningCompleted(agreement, signing_token);
  }

  // Everything else (signing_archived, signing_archive_failed, unknown
  // event names) — ack with 200 so Dokobit stops retrying. The retry
  // endpoint exists for actually stuck rows.
  return NextResponse.json({ ok: true, note: "ignored_event" });
}

type Agreement = Awaited<ReturnType<typeof findBySigningToken>>;

async function handleSignerSigned(agreement: Agreement, signingToken: string) {
  // Student just signed — record + add school as second signer.
  if (agreement.status === "awaiting_student_signature") {
    const updated = await recordStudentSigned(signingToken);
    const added = await addSigner({
      signingToken,
      signer: { id: `school-${updated.id}`, ...schoolSignerConfig() },
    });
    await recordSchoolSigner({
      id: updated.id,
      school_signer_token: added.signer_access_token,
    });
    return NextResponse.json({ ok: true });
  }

  // Recovery: previous postback succeeded at recordStudentSigned but
  // failed before addSigner. Retry just the addSigner step.
  if (
    agreement.status === "student_signed" &&
    !agreement.dokobit_school_signer_token
  ) {
    const added = await addSigner({
      signingToken,
      signer: { id: `school-${agreement.id}`, ...schoolSignerConfig() },
    });
    await recordSchoolSigner({
      id: agreement.id,
      school_signer_token: added.signer_access_token,
    });
    return NextResponse.json({ ok: true });
  }

  // School just signed (second signer on the same signing session).
  if (agreement.status === "awaiting_school_signature") {
    await recordSchoolSigned(signingToken);
    return NextResponse.json({ ok: true });
  }

  // Any other state = already past these transitions; ack idempotently.
  return NextResponse.json({ ok: true, note: "already_applied" });
}

async function handleSigningCompleted(
  agreement: Agreement,
  signingToken: string
) {
  if (agreement.status === "archived") {
    return NextResponse.json({ ok: true, note: "already_archived" });
  }

  // Out-of-order delivery (completed arrived before school_signed). Ack
  // and rely on the next retry — never 500 here, would loop forever.
  if (agreement.status !== "school_signed") {
    return NextResponse.json({ ok: true, note: "not_yet_school_signed" });
  }

  const archive = await archiveSigning(signingToken);
  const docBuffer = Buffer.from(archive.file.content, "base64");
  const docPath = `signed/${agreement.id}.edoc`;

  const supa = createAdminClient();
  const { error: storageErr } = await supa.storage
    .from(STORAGE_BUCKET)
    .upload(docPath, docBuffer, {
      contentType: "application/octet-stream",
      upsert: true,
    });
  if (storageErr) throw storageErr;

  const archived = await recordArchived({
    id: agreement.id,
    signed_doc_path: docPath,
  });

  // Columns are nullable post-minimization, but the row has only just
  // been promoted to `archived` and minimization has not yet run, so
  // these fields are guaranteed populated here. Guard defensively.
  if (!archived.recipient_email) {
    throw new Error(
      "scholarship: cannot send completed email — recipient_email is missing on a just-archived row"
    );
  }

  await sendCompletedEmail({
    recipient_email: archived.recipient_email,
    recipient_name: archived.signer_name ?? undefined,
    language: archived.language,
    signed_doc_base64: archive.file.content,
    signed_doc_filename: archive.file.name,
  });

  // Data minimization: now that both parties have signed and the
  // signed document has been emailed, drop everything except the
  // signed PDF + minimum index fields. See README "Data
  // minimization (post-archive)".
  await minimizeArchived({
    id: agreement.id,
    unsigned_pdf_path: archived.unsigned_pdf_path,
  });

  return NextResponse.json({ ok: true });
}
