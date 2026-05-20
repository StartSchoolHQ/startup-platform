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

const DEFAULT_SIGNING_OPTIONS: DokobitSigningMethod[] = [
  "smartid",
  "eparaksts_mobile",
  "mobile",
  "stationary",
];

// Smart-ID requires per-transaction PIN entry by protocol — not a Dokobit
// limitation. The batch endpoint therefore excludes smartid.
const BATCH_SIGNING_OPTIONS: DokobitSigningMethod[] = [
  "eparaksts_mobile",
  "stationary",
];

const MAX_BATCH_SIZE = 20;

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
  signingPurpose?: string;
  language?: string;
  signingOptions?: DokobitSigningMethod[];
}

export async function createSigning(input: CreateSigningInput) {
  const raw = await dokobitFetch<unknown>({
    product: "documents",
    method: "POST",
    path: "/api/signing/create.json",
    body: {
      type: input.type,
      name: input.name,
      postback_url: input.postbackUrl,
      language: input.language ?? "en",
      signing_purpose: input.signingPurpose ?? "agreement",
      signing_options: input.signingOptions ?? DEFAULT_SIGNING_OPTIONS,
      files: [{ token: input.fileToken }],
      signers: [input.signer],
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
}) {
  const raw = await dokobitFetch<unknown>({
    product: "documents",
    method: "POST",
    path: `/api/signing/${input.signingToken}/addsigner.json`,
    body: { signers: [input.signer] },
  });
  return DokobitAddSignerResponse.parse(raw);
}

// ============================================================
// Batch signing
// ============================================================

interface CreateBatchInput {
  signingTokens: string[];
  signer: DokobitSigner;
  postbackUrl: string;
  language?: string;
}

/**
 * Bundles existing signing sessions into a single batch so the signer
 * confirms all of them with one PIN entry.
 *
 * Constraints:
 * - Max 20 signings per batch (Dokobit limit).
 * - Smart-ID is excluded — Smart-ID's own protocol requires per-doc PIN.
 *   Use the sequential `addSigner` + per-doc UI flow for Smart-ID signers.
 */
export async function createBatch(input: CreateBatchInput) {
  if (input.signingTokens.length === 0) {
    throw new Error("createBatch requires at least one signing token");
  }
  if (input.signingTokens.length > MAX_BATCH_SIZE) {
    throw new Error(
      `createBatch max ${MAX_BATCH_SIZE} signings per batch (got ${input.signingTokens.length})`
    );
  }

  const raw = await dokobitFetch<unknown>({
    product: "documents",
    method: "POST",
    path: "/api/signing/createbatch.json",
    body: {
      signers: [input.signer],
      signings: input.signingTokens.map((t) => ({ token: t })),
      postback_url: input.postbackUrl,
      language: input.language ?? "en",
      signing_options: BATCH_SIGNING_OPTIONS,
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

export async function archiveSigning(signingToken: string) {
  const raw = await dokobitFetch<unknown>({
    product: "documents",
    method: "POST",
    path: `/api/signing/${signingToken}/archive.json`,
  });
  return DokobitArchiveResponse.parse(raw);
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
