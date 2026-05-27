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
import { userMessageForDokobitError } from "@/lib/dokobit/errors";
import { getAuthStatus } from "@/lib/dokobit/identity";
import {
  buildSigningUiUrl,
  createSigning,
  uploadFile,
} from "@/lib/dokobit/signing";
import {
  findByAuthToken,
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

  let agreement = await findByAuthToken(dokobit_session_token);

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
