/**
 * Dokobit Documents Gateway wrapper — signing + batch operations.
 *
 * Endpoints:
 * - uploadFile — pushes a PDF to Dokobit storage; returns a file token.
 * - createSigning — creates a signing session for a single document.
 * - addSigner — appends a second signer (the school) to an existing session.
 * - createBatch — bundles N existing signing sessions for a single signer
 *   to sign with ONE PIN. Smart-ID is NOT supported by the Smart-ID
 *   protocol; only eParaksts Mobile, SmartCard, or USB token. Max 20.
 * - getSigningStatus — re-verify the truth before acting on a webhook.
 * - archiveSigning — fetches the final signed `.edoc` (base64) after both
 *   parties have signed.
 *
 * URL helpers (`buildSigningUiUrl`, `buildBatchUiUrl`) compose the hosted
 * Dokobit URLs to redirect users to.
 */
import { dokobitFetch } from "./client";
import {
  DokobitAddSignerResponse,
  DokobitArchiveResponse,
  DokobitCreateBatchResponse,
  DokobitCreateSigningResponse,
  DokobitSigningStatusResponse,
  DokobitUploadResponse,
} from "./types";

export type DokobitSigningMethod =
  | "mobile"
  | "smartid"
  | "stationary"
  | "eparaksts_mobile"
  | "audkenni_app";

export interface DokobitSigner {
  id: string;
  name: string;
  surname: string;
  code: string;
  country_code: string;
}

// "mobile" (Mobile-ID) is omitted: it's an EE/LT-only service and our LV
// sandbox token doesn't have it enabled. Re-add if/when a multi-country
// token or LT/EE student flow is needed.
const DEFAULT_SIGNING_OPTIONS: DokobitSigningMethod[] = [
  "smartid",
  "eparaksts_mobile",
  "stationary",
];

// Dokobit's API allows up to 20, but their integration-review checklist
// recommends ≤10 per batch for consistent performance. Capped at 10 to
// match the review criteria. Bump back to 20 only if perf demands it
// and Dokobit confirms it's acceptable for production.
const MAX_BATCH_SIZE = 10;

// ============================================================
// File upload
// ============================================================

export async function uploadFile(input: {
  name: string;
  base64Content: string;
  digestSha256: string;
}) {
  const raw = await dokobitFetch<unknown>({
    product: "documents",
    method: "POST",
    path: "/api/file/upload.json",
    body: {
      file: {
        name: input.name,
        digest: input.digestSha256,
        content: input.base64Content,
      },
    },
  });
  return DokobitUploadResponse.parse(raw);
}

// ============================================================
// Create signing (single)
// ============================================================

interface CreateSigningInput {
  type: "pdf" | "asice" | "edoc";
  name: string;
  fileToken: string;
  signer: DokobitSigner;
  postbackUrl: string;
  /**
   * One of Dokobit's documented signing_purpose enum values. Defaults to
   * `"signature"`, the only generic-contract-signing variant. Other values
   * (confirmation, visa, conciliation, registration, …) are listed in
   * Dokobit's API docs and rarely apply for our scholarship flow.
   */
  signingPurpose?: string;
  language?: string;
  signingOptions?: DokobitSigningMethod[];
}

export async function createSigning(input: CreateSigningInput) {
  // Per Dokobit's spec, signing_purpose and signing_options live on the
  // signer object, NOT at the top level of /api/signing/create.json.
  // Passing them at the top level is silently ignored.
  const signerPayload = {
    ...input.signer,
    signing_purpose: input.signingPurpose ?? "signature",
    signing_options: input.signingOptions ?? DEFAULT_SIGNING_OPTIONS,
  };
  const raw = await dokobitFetch<unknown>({
    product: "documents",
    method: "POST",
    path: "/api/signing/create.json",
    body: {
      type: input.type,
      name: input.name,
      postback_url: input.postbackUrl,
      language: input.language ?? "en",
      files: [{ token: input.fileToken }],
      signers: [signerPayload],
    },
  });
  return DokobitCreateSigningResponse.parse(raw);
}

// ============================================================
// Add signer (used to attach the school countersigner to a session)
// ============================================================

export async function addSigner(input: {
  signingToken: string;
  signer: DokobitSigner;
  signingPurpose?: string;
  signingOptions?: DokobitSigningMethod[];
}) {
  // Same shape as `createSigning`: signing_purpose and signing_options
  // live on the signer object, not at the top level. Dokobit rejects
  // the request with 400 "[signing_purpose] is missing" if absent.
  const signerPayload = {
    ...input.signer,
    signing_purpose: input.signingPurpose ?? "signature",
    signing_options: input.signingOptions ?? DEFAULT_SIGNING_OPTIONS,
  };
  const raw = await dokobitFetch<unknown>({
    product: "documents",
    method: "POST",
    path: `/api/signing/${input.signingToken}/addsigner.json`,
    body: { signers: [signerPayload] },
  });
  try {
    return DokobitAddSignerResponse.parse(raw);
  } catch (parseErr) {
    console.error(
      "[addSigner] response shape unexpected. Raw payload:",
      JSON.stringify(raw)
    );
    throw parseErr;
  }
}

// ============================================================
// Batch signing
// ============================================================

export interface BatchSigningEntry {
  /** Token returned by `createSigning`, identifying one document. */
  signing_token: string;
  /**
   * Per-signing access token for the signer who will batch-confirm. For
   * the scholarship flow that's the school countersigner — the value
   * `dokobit_school_signer_token` recorded after `addSigner` in the
   * student-signed webhook.
   */
  signer_token: string;
}

interface CreateBatchInput {
  signings: BatchSigningEntry[];
  postbackUrl: string;
  language?: string;
}

/**
 * Bundles existing signing sessions into a single batch so the signer
 * confirms all of them with one PIN entry.
 *
 * Per Dokobit's spec, every batch entry must carry both the signing token
 * AND the signer access token issued for THAT signing (from `createSigning`
 * or `addSigner`). The endpoint does NOT accept a top-level `signers` array.
 *
 * Constraints:
 * - Max 20 signings per batch (Dokobit limit).
 * - Smart-ID is excluded — Smart-ID's own protocol requires per-doc PIN.
 *   Use the sequential `addSigner` + per-doc UI flow for Smart-ID signers.
 */
export async function createBatch(input: CreateBatchInput) {
  if (input.signings.length === 0) {
    throw new Error("createBatch requires at least one signing");
  }
  if (input.signings.length > MAX_BATCH_SIZE) {
    throw new Error(
      `createBatch max ${MAX_BATCH_SIZE} signings per batch (got ${input.signings.length})`
    );
  }
  for (const s of input.signings) {
    if (!s.signing_token || !s.signer_token) {
      throw new Error(
        "createBatch entries require both signing_token and signer_token"
      );
    }
  }

  // Per Dokobit's official Postman example, createbatch.json accepts ONLY
  // `{signings: [...]}`. `postback_url` and `language` are inherited from
  // the underlying signing sessions created via /api/signing/create.json —
  // passing them at the top level returns 400 "field was not expected".
  void input.postbackUrl;
  void input.language;

  const raw = await dokobitFetch<unknown>({
    product: "documents",
    method: "POST",
    path: "/api/signing/createbatch.json",
    body: {
      signings: input.signings.map((s) => ({
        token: s.signing_token,
        signer_token: s.signer_token,
      })),
    },
  });
  return DokobitCreateBatchResponse.parse(raw);
}

// ============================================================
// Status + archive
// ============================================================

export async function getSigningStatus(signingToken: string) {
  const raw = await dokobitFetch<unknown>({
    product: "documents",
    method: "GET",
    path: `/api/signing/${signingToken}/status.json`,
  });
  return DokobitSigningStatusResponse.parse(raw);
}

/**
 * Fetches the final signed PDF (with embedded qualified e-signatures from
 * all parties) as base64. Returns the legacy `{file: {content, name}}`
 * shape so existing callers don't need refactoring.
 *
 * Implementation note: Dokobit's documented `/archive.json` endpoint
 * returns only `{status, token}` — it does NOT include the file body.
 * The actual signed document is streamed from `/download?access_token=...`,
 * which is why we GET that endpoint directly (bypassing the JSON-only
 * `dokobitFetch` wrapper).
 */
export async function archiveSigning(signingToken: string) {
  const base = process.env.DOKOBIT_DOCUMENTS_BASE_URL;
  const key = process.env.DOKOBIT_DOCUMENTS_API_KEY;
  if (!base || !key) {
    throw new Error(
      "archiveSigning: DOKOBIT_DOCUMENTS_BASE_URL / _API_KEY not configured"
    );
  }
  const url = new URL(`/api/signing/${signingToken}/download`, base);
  url.searchParams.set("access_token", key);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Dokobit download ${signingToken} failed: ${res.status} — ${body.slice(0, 200)}`
    );
  }
  const bytes = Buffer.from(await res.arrayBuffer());

  return DokobitArchiveResponse.parse({
    status: "ok",
    file: {
      name: `${signingToken}.pdf`,
      content: bytes.toString("base64"),
    },
  });
}

// ============================================================
// URL helpers for redirecting users to Dokobit's hosted signing UI
// ============================================================

function documentsUiBase(): string {
  const base =
    process.env.DOKOBIT_DOCUMENTS_UI_BASE_URL ||
    process.env.DOKOBIT_DOCUMENTS_BASE_URL;
  if (!base) {
    throw new Error("DOKOBIT_DOCUMENTS_BASE_URL (or _UI_BASE_URL) is not set");
  }
  return base;
}

export function buildSigningUiUrl(
  signingToken: string,
  signerAccessToken: string
): string {
  const u = new URL(`/signing/${signingToken}`, documentsUiBase());
  u.searchParams.set("access_token", signerAccessToken);
  return u.toString();
}

export function buildBatchUiUrl(batchToken: string): string {
  return new URL(`/signing/batch/${batchToken}`, documentsUiBase()).toString();
}
