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
  findByAuthToken,
  recordEvent,
  recordIdentity,
  recordSigningSession,
} from "@/lib/scholarship/data";
import { buildAgreementFilename } from "@/lib/scholarship/filename";
import { renderContractPdf } from "@/lib/scholarship/pdf";
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
  return { code: "unknown_error", message: String(err) };
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
  return { reference, kind: "unknown", value: String(err) };
}

export interface CompleteIdentityInput {
  dokobit_session_token: string;
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
  const { dokobit_session_token, origin } = input;

  const agreement = await findByAuthToken(dokobit_session_token);

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
    return await runOrchestration(agreement, origin, dokobit_session_token);
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
  agreement: Awaited<ReturnType<typeof findByAuthToken>>,
  origin: string,
  dokobit_session_token: string
): Promise<CompleteIdentityResult> {
  // Verify the Dokobit eID session actually completed.
  const status = await getAuthStatus(dokobit_session_token);
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

  // Lock identity on the row (or no-op if already locked to the same person).
  try {
    agreement = await recordIdentity({
      dokobit_auth_token: dokobit_session_token,
      personal_code: status.code,
      country_code: status.country_code,
      name: status.name,
      surname: status.surname,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
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
    postbackUrl: `${origin}/api/webhooks/dokobit`,
    language: agreement.language,
  });

  const signerEntry = signing.signers[0];

  await recordSigningSession({
    id: agreement.id,
    signing_token: signing.token,
    signer_token: signerEntry.access_token,
    unsigned_pdf_path: unsignedPath,
  });

  return {
    signing_ui_url: buildSigningUiUrl(signing.token, signerEntry.access_token),
  };
}
