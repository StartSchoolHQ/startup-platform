/**
 * Identity-callback orchestration: eID complete → PDF render → Dokobit
 * signing session → returns the hosted-UI URL we redirect the student to.
 *
 * Used by:
 *   - `/agreement/identity-callback` page (server component) on first hit
 *   - The admin retry endpoint to recover from a stuck identity_verified
 *     or failed row
 *
 * Idempotent: if the row already has a Dokobit signing session, returns
 * the existing UI URL without re-rendering the PDF or re-uploading.
 */
import { createHash } from "crypto";
import { ZodError } from "zod";
import { DokobitError } from "@/lib/dokobit/client";
import { userMessageForDokobitError } from "@/lib/dokobit/errors";
import { getAuthStatus } from "@/lib/dokobit/identity";
import {
  buildSigningUiUrl,
  createSigning,
  uploadFile,
  waitForFileUploaded,
} from "@/lib/dokobit/signing";
import {
  attachReturnToken,
  findByCallbackRef,
  recordEvent,
  recordIdentity,
  recordSigningSessionV2,
} from "@/lib/scholarship/data";
import { buildAgreementFilename } from "@/lib/scholarship/filename";
import { renderContractPdf } from "@/lib/scholarship/pdf";
import { schoolSignerConfig } from "@/lib/scholarship/school-signer";
import { createAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "scholarship-documents";

const HAS_SIGNING_SESSION = new Set<string>([
  "awaiting_student_signature",
  "student_signed",
  "awaiting_school_signature",
  "school_signed",
  "archived",
]);

export class CompleteIdentityError extends Error {
  constructor(
    public readonly code:
      | "auth_not_complete"
      | "identity_mismatch"
      | "auth_error"
      | "already_signed",
    message: string
  ) {
    super(message);
    this.name = "CompleteIdentityError";
  }
}

export interface OrchestrationErrorDetail {
  /** Short machine code, safe to show on screen (e.g. dokobit_http_400). */
  code: string;
  /** One-line human/technical summary, safe to show on screen. */
  message: string;
}

/**
 * Wraps any UNEXPECTED orchestration failure (i.e. not a handled
 * `CompleteIdentityError`) so the callback page can show a reference code
 * + technical detail instead of an opaque "something went wrong". The full
 * raw error is also written to the `error` audit event and console before
 * this is thrown — see `completeIdentityAndCreateSigning`'s catch.
 */
export class OrchestrationError extends Error {
  constructor(
    public readonly reference: string,
    public readonly detail: OrchestrationErrorDetail
  ) {
    super(detail.message);
    this.name = "OrchestrationError";
  }
}

/**
 * Supabase errors (PostgrestError, StorageError) are PLAIN OBJECTS, not
 * `Error` instances — so `err instanceof Error` is false and `String(err)`
 * yields "[object Object]". Extract a usable message + optional pg code from
 * anything thrown so RPC `raise exception` messages (e.g.
 * `scholarship_already_signed`) and real DB errors are never swallowed.
 */
function errorInfo(err: unknown): { message: string; code?: string } {
  if (err instanceof Error) return { message: err.message };
  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    const message =
      typeof o.message === "string" && o.message
        ? o.message
        : JSON.stringify(o);
    const code = typeof o.code === "string" ? o.code : undefined;
    return { message, code };
  }
  return { message: String(err) };
}

/**
 * Short, on-screen-safe summary of an unexpected failure. NEVER includes
 * the API key (it lives only in the request query string, never in the
 * thrown message/body) — for DokobitError we expose only the HTTP status.
 */
function summarizeError(err: unknown): OrchestrationErrorDetail {
  if (err instanceof DokobitError) {
    return {
      code: `dokobit_http_${err.status}`,
      message: `The identity provider returned HTTP ${err.status} while we were preparing your contract.`,
    };
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const path = first?.path.join(".") || "(root)";
    return {
      code: "dokobit_bad_response_shape",
      message: `The identity provider returned an unexpected response (field "${path}": ${
        first?.message ?? "validation failed"
      }).`,
    };
  }
  if (err instanceof Error) {
    return { code: "orchestration_error", message: err.message };
  }
  // Plain-object throw (Supabase PostgrestError/StorageError). Surface its
  // real message + pg code instead of an opaque "[object Object]".
  const info = errorInfo(err);
  return {
    code: info.code ? `db_${info.code}` : "unknown_error",
    message: info.message,
  };
}

/**
 * Rich diagnostic payload for the `error` audit event. This lands in our
 * admin-only events table (not exposed to clients), so it carries the full
 * Dokobit status + response body / Zod issues / stack to make the root
 * cause obvious without trawling truncated serverless logs.
 */
function diagnosticPayload(
  err: unknown,
  reference: string
): Record<string, unknown> {
  if (err instanceof DokobitError) {
    return {
      reference,
      kind: "DokobitError",
      status: err.status,
      message: err.message,
      body: err.body,
    };
  }
  if (err instanceof ZodError) {
    return { reference, kind: "ZodError", issues: err.issues };
  }
  if (err instanceof Error) {
    return {
      reference,
      kind: err.name,
      message: err.message,
      stack: err.stack ?? null,
    };
  }
  const info = errorInfo(err);
  return {
    reference,
    kind: "non_error",
    code: info.code ?? null,
    message: info.message,
  };
}

export interface CompleteIdentityInput {
  /** OUR correlation key from the return_url — used to find the row. */
  callback_ref: string;
  /** Dokobit's RETURN_TOKEN (appended to the callback) — used for status. */
  dokobit_return_token: string;
  origin: string;
}

export interface CompleteIdentityResult {
  signing_ui_url: string;
}

function formatRef(id: string): string {
  return `SS-${new Date().getUTCFullYear()}-${id.slice(0, 8).toUpperCase()}`;
}

function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getUTCFullYear()}`;
}

export async function completeIdentityAndCreateSigning(
  input: CompleteIdentityInput
): Promise<CompleteIdentityResult> {
  const { callback_ref, dokobit_return_token, origin } = input;

  const agreement = await findByCallbackRef(callback_ref);

  // Idempotency: row already has a signing session — return its UI URL.
  if (
    agreement.dokobit_signing_token &&
    agreement.dokobit_signer_token &&
    HAS_SIGNING_SESSION.has(agreement.status)
  ) {
    return {
      signing_ui_url: buildSigningUiUrl(
        agreement.dokobit_signing_token,
        agreement.dokobit_signer_token
      ),
    };
  }

  // Reference shown to the user on failure + correlation key in the audit
  // trail. Stable across retries (derived from the row id).
  const reference = formatRef(agreement.id);

  try {
    return await runOrchestration(agreement, origin, dokobit_return_token);
  } catch (err) {
    // Handled, user-friendly identity failures pass through untouched.
    if (err instanceof CompleteIdentityError) throw err;

    const detail = summarizeError(err);

    // Durable diagnostic: serverless logs truncate, so the real cause goes
    // into the append-only events table. Best-effort — a logging failure
    // must never mask the original error.
    try {
      await recordEvent({
        id: agreement.id,
        event_type: "error",
        payload: diagnosticPayload(err, reference),
      });
    } catch (logErr) {
      console.error(
        "[complete-identity] failed to record error event:",
        logErr
      );
    }
    console.error(
      `[complete-identity] orchestration failed (${reference}):`,
      err
    );

    throw new OrchestrationError(reference, detail);
  }
}

/**
 * The actual identity → PDF → Dokobit signing pipeline. Split out so
 * `completeIdentityAndCreateSigning` can wrap it in a single diagnostic
 * catch without nesting the whole body in a try block.
 */
async function runOrchestration(
  agreement: Awaited<ReturnType<typeof findByCallbackRef>>,
  origin: string,
  dokobit_return_token: string
): Promise<CompleteIdentityResult> {
  // Verify the Dokobit eID session actually completed. Status is fetched
  // with the RETURN_TOKEN Dokobit appended to the callback — NOT the
  // create-session token (Dokobit issues two different tokens).
  const status = await getAuthStatus(dokobit_return_token);
  if (status.status === "error") {
    const friendly = userMessageForDokobitError(status);
    throw new CompleteIdentityError(
      "auth_error",
      friendly ?? "Identity verification failed"
    );
  }
  if (status.status !== "ok") {
    throw new CompleteIdentityError(
      "auth_not_complete",
      "Dokobit eID session is not yet complete"
    );
  }

  // Persist Dokobit's RETURN_TOKEN onto the row so recordIdentity (which
  // looks the row up by dokobit_auth_token) resolves, and so admin Retry
  // has a real Dokobit token. Idempotent.
  await attachReturnToken({
    id: agreement.id,
    return_token: dokobit_return_token,
  });

  // Lock identity on the row (or no-op if already locked to the same person).
  try {
    agreement = await recordIdentity({
      dokobit_auth_token: dokobit_return_token,
      personal_code: status.code,
      country_code: status.country_code,
      name: status.name,
      surname: status.surname,
    });
  } catch (err) {
    // Supabase surfaces the RPC's `raise exception '...'` as a PostgrestError
    // (a plain object), so read the message via errorInfo — NOT instanceof.
    const msg = errorInfo(err).message;
    if (msg.includes("scholarship_already_signed")) {
      throw new CompleteIdentityError(
        "already_signed",
        "You've already signed this agreement"
      );
    }
    if (msg.includes("scholarship_identity_mismatch")) {
      throw new CompleteIdentityError(
        "identity_mismatch",
        "This agreement is locked to a different identity"
      );
    }
    throw err;
  }

  // Columns are nullable post-minimization, but identity completion
  // only runs on rows that haven't even reached `archived` yet — they
  // must be populated. Guard defensively to surface schema drift early.
  if (
    !agreement.recipient_email ||
    !agreement.recipient_phone ||
    !agreement.recipient_address
  ) {
    throw new Error(
      "scholarship: cannot render contract — recipient fields are missing"
    );
  }

  // Render the contract PDF in-process (HTML → PDF via headless Chromium)
  // and upload to storage + Dokobit. Each step is independent so a partial
  // failure leaves the row in identity_verified, recoverable by the admin
  // "Retry" action.
  const pdfBuffer = await renderContractPdf({
    agreement_type: agreement.agreement_type,
    signer: {
      name: status.name,
      surname: status.surname,
      personal_code: status.code,
      country_code: status.country_code,
    },
    recipient_email: agreement.recipient_email,
    recipient_phone: agreement.recipient_phone,
    recipient_address: agreement.recipient_address,
    date_today: formatDateDDMMYYYY(new Date()),
    agreement_reference: formatRef(agreement.id),
  });

  const supa = createAdminClient();
  const unsignedPath = `unsigned/${agreement.id}.pdf`;
  const { error: uploadErr } = await supa.storage
    .from(STORAGE_BUCKET)
    .upload(unsignedPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr) throw uploadErr;

  const digest = createHash("sha256").update(pdfBuffer).digest("hex");
  // User-facing filename. Dokobit shows this in the signing UI and uses it
  // as the default attachment name when the signer downloads the document.
  const filename = buildAgreementFilename({
    name: status.name,
    surname: status.surname,
    agreement_type: agreement.agreement_type,
    ext: "pdf",
  });
  const upload = await uploadFile({
    name: filename,
    base64Content: pdfBuffer.toString("base64"),
    digestSha256: digest,
  });
  // Per Dokobit's documented flow, the upload is async on their side —
  // poll the status endpoint until the file is "uploaded" before kicking
  // off the signing session. For inline base64 (our case) this almost
  // always returns immediately; the polling guards against the rare slow
  // ingestion that would otherwise race against createSigning.
  await waitForFileUploaded(upload.token);

  // The school (StartSchool board member) is placed on the document as a
  // co-signer AT CREATION, not bolted on after the student signs. A
  // single-signer Dokobit signing completes the instant that signer signs,
  // which previously sealed the contract with only the student's signature
  // ("all parties signed"). With both signers present up front, the
  // student's signature leaves the document at 1-of-2 — awaiting the school
  // — and the reactive addSigner step is gone.
  // Dokobit relates batch signers by the signer `id` ("unique user identifier
  // from your system"), NOT by personal code. A per-agreement id makes the
  // board member look like a different user on every contract, so
  // createbatch.json rejects the batch with "All signer tokens must be related
  // to same user". A STABLE id (one per board member) is what lets a single
  // PIN countersign many documents at once. Verified on Dokobit sandbox:
  // per-agreement id -> 400; constant id -> 200.
  const schoolConfig = schoolSignerConfig();
  const schoolSignerId = `school-${schoolConfig.country_code}-${schoolConfig.code}`;
  const signing = await createSigning({
    // `edoc` (ASiC-E container) is the LV legal standard — opens in
    // eParaksts viewer. `pdf` produces a PDF with embedded signatures
    // which has the same legal weight but isn't recognised as an .edoc.
    type: "edoc",
    name: `StartSchool agreement ${formatRef(agreement.id)}`,
    fileToken: upload.token,
    signer: {
      id: agreement.id,
      name: status.name,
      surname: status.surname,
      code: status.code,
      country_code: status.country_code,
    },
    coSigners: [{ id: schoolSignerId, ...schoolConfig }],
    postbackUrl: `${origin}/api/webhooks/dokobit`,
    language: agreement.language,
  });

  // Correlate the returned access tokens back to each signer by the id we
  // sent — the response order is not guaranteed (Dokobit may return a keyed
  // object). The student signs first via their token; the school's token is
  // stored now and used by the admin countersign flow later.
  const studentEntry = signing.signers.find((s) => s.id === agreement.id);
  const schoolEntry = signing.signers.find((s) => s.id === schoolSignerId);
  if (!studentEntry || !schoolEntry) {
    throw new Error(
      "scholarship: Dokobit create-signing response missing the student or school signer token"
    );
  }

  await recordSigningSessionV2({
    id: agreement.id,
    signing_token: signing.token,
    signer_token: studentEntry.access_token,
    school_signer_token: schoolEntry.access_token,
    unsigned_pdf_path: unsignedPath,
  });

  return {
    signing_ui_url: buildSigningUiUrl(signing.token, studentEntry.access_token),
  };
}
