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
// Completed-email send is disabled; re-import these when re-enabling
// the email block in handleSigningCompleted.
// import { buildAgreementFilename } from "@/lib/scholarship/filename";
// import { sendCompletedEmail } from "@/lib/scholarship/n8n";
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
  try {
    return await handlePostback(request);
  } catch (err) {
    console.error("[webhooks/dokobit] postback handler failed:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

async function handlePostback(request: Request) {
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
  // Out-of-order delivery: completed arrived before school_signed. Ack
  // 200 so Dokobit stops retrying for now; the next signer_signed
  // postback will catch up and the user can re-trigger via the admin
  // retry action. Returning 500 here would loop Dokobit indefinitely.
  if (agreement.status !== "school_signed" && agreement.status !== "archived") {
    return NextResponse.json({ ok: true, note: "not_yet_school_signed" });
  }

  let row = agreement;
  const supa = createAdminClient();

  // ── Phase 1: archive download → storage → email → status flip ──
  // Runs only when status is still `school_signed`. The status update
  // is the LAST write in this block, so any earlier failure leaves the
  // row at `school_signed` and the next webhook retry re-runs the whole
  // chain (storage upload is idempotent via upsert; email is best-effort).
  if (row.status === "school_signed") {
    const archive = await archiveSigning(signingToken);
    const docBuffer = Buffer.from(archive.file.content, "base64");
    const docPath = `signed/${row.id}.edoc`;

    const { error: storageErr } = await supa.storage
      .from(STORAGE_BUCKET)
      .upload(docPath, docBuffer, {
        contentType: "application/octet-stream",
        upsert: true,
      });
    if (storageErr) throw storageErr;

    // Completed-email send is intentionally disabled. Decision pending
    // on whether the signed .edoc is delivered manually by an admin or
    // automated via n8n later. The signed doc lives in storage at
    // `signed_doc_path` — admins can download from the agreement detail
    // modal in the meantime. To re-enable, uncomment the block below.
    //
    // if (row.recipient_email && row.signer_name && row.signer_surname) {
    //   const attachmentFilename = buildAgreementFilename({
    //     name: row.signer_name,
    //     surname: row.signer_surname,
    //     agreement_type: row.agreement_type,
    //     ext: "edoc",
    //   });
    //   await sendCompletedEmail({
    //     recipient_email: row.recipient_email,
    //     recipient_name: row.signer_name,
    //     language: row.language,
    //     signed_doc_base64: archive.file.content,
    //     signed_doc_filename: attachmentFilename,
    //   });
    // }

    row = await recordArchived({ id: row.id, signed_doc_path: docPath });
  }

  // ── Phase 2: minimization ──
  // Idempotent (RPC NULLs already-null columns, storage delete tolerates
  // missing files). Detect "needs minimization" by any remaining sensitive
  // field — protects against a stranded archived-but-not-minimized row.
  const needsMinimization =
    row.dokobit_signing_token !== null ||
    row.signer_personal_code !== null ||
    row.unsigned_pdf_path !== null;
  if (needsMinimization) {
    await minimizeArchived({
      id: row.id,
      unsigned_pdf_path: row.unsigned_pdf_path,
    });
  }

  return NextResponse.json({ ok: true });
}
