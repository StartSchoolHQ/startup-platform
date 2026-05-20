import { z } from "zod";

/**
 * Zod response schemas for the Dokobit Identity Gateway and Documents
 * Gateway APIs.
 *
 * All schemas use `.passthrough()` for forward-compatibility with response
 * shape changes. We hard-validate only the fields the integration actually
 * reads — extra keys are tolerated, missing keys we don't use are tolerated,
 * and missing required keys we DO use will fail loudly at parse time so we
 * notice immediately instead of silently producing garbage downstream.
 */

// ============================================================
// Identity Gateway
// ============================================================

export const DokobitCreateAuthSessionResponse = z
  .object({
    status: z.literal("ok"),
    session_token: z.string(),
    url: z.string().url(),
  })
  .passthrough();

const DokobitAuthenticatedStatus = z
  .object({
    status: z.literal("ok"),
    code: z.string(),
    country_code: z.string(),
    name: z.string(),
    surname: z.string(),
  })
  .passthrough();

const DokobitWaitingStatus = z
  .object({
    status: z.literal("waiting"),
  })
  .passthrough();

export const DokobitAuthStatusResponse = z.union([
  DokobitAuthenticatedStatus,
  DokobitWaitingStatus,
]);

export type DokobitAuthStatus = z.infer<typeof DokobitAuthStatusResponse>;

// ============================================================
// Documents Gateway — file upload
// ============================================================

export const DokobitUploadResponse = z
  .object({
    status: z.literal("ok"),
    token: z.string(),
  })
  .passthrough();

// ============================================================
// Documents Gateway — signing create / addsigner
// ============================================================

// Dokobit returns `access_token` in newer responses and `signer_access_token`
// in some older endpoints — coerce to a single canonical field.
const DokobitSignerEntry = z
  .object({
    id: z.string(),
    access_token: z.string().optional(),
    signer_access_token: z.string().optional(),
  })
  .passthrough()
  .transform((s) => ({
    id: s.id,
    access_token: s.access_token ?? s.signer_access_token ?? "",
  }))
  .refine((s) => s.access_token.length > 0, {
    message: "Dokobit signer entry missing access_token",
  });

export const DokobitCreateSigningResponse = z
  .object({
    status: z.literal("ok"),
    token: z.string(),
    signers: z.array(DokobitSignerEntry).min(1),
  })
  .passthrough();

export const DokobitAddSignerResponse = z
  .object({
    status: z.literal("ok"),
    signer_access_token: z.string().optional(),
    access_token: z.string().optional(),
  })
  .passthrough()
  .transform((r) => ({
    status: r.status,
    signer_access_token: r.signer_access_token ?? r.access_token ?? "",
  }))
  .refine((r) => r.signer_access_token.length > 0, {
    message: "Dokobit addsigner response missing access_token",
  });

// ============================================================
// Documents Gateway — batch
// ============================================================

export const DokobitCreateBatchResponse = z
  .object({
    status: z.literal("ok"),
    token: z.string(),
    url: z.string().url().optional(),
  })
  .passthrough();

// ============================================================
// Documents Gateway — status / archive
// ============================================================

export const DokobitSigningStatusResponse = z
  .object({
    status: z.string(),
  })
  .passthrough();

export const DokobitArchiveResponse = z
  .object({
    status: z.literal("ok"),
    file: z
      .object({
        name: z.string(),
        content: z.string(), // base64
      })
      .passthrough(),
  })
  .passthrough();

// ============================================================
// Webhook (postback) payload
// ============================================================

/**
 * Dokobit postback shapes vary by signing type. We accept any extra fields,
 * require only signing_token (the rest we re-verify by calling
 * getSigningStatus before acting on it).
 */
export const DokobitWebhookPayload = z
  .object({
    event: z.string().optional(),
    status: z.string().optional(),
    signing_token: z.string().optional(),
    token: z.string().optional(),
  })
  .passthrough()
  .transform((p) => ({
    event: p.event ?? p.status ?? "",
    signing_token: p.signing_token ?? p.token ?? "",
  }))
  .refine((p) => p.signing_token.length > 0, {
    message: "Dokobit webhook payload missing signing_token",
  });

export type DokobitWebhookPayloadParsed = z.infer<typeof DokobitWebhookPayload>;
