/**
 * n8n webhook callers for the scholarship-agreement module.
 *
 * Two webhooks:
 *
 * - `renderPdf` (synchronous): n8n receives the rendered HTML, runs it
 *   through a headless Chromium / Gotenberg, and returns the PDF buffer as
 *   the HTTP response body.
 *
 * - `sendCompletedEmail` (fire-and-forget): n8n receives the signed `.edoc`
 *   payload (base64) plus recipient details and emails it to the student.
 *
 * Every request is signed with HMAC-SHA256 over the raw JSON body using
 * `N8N_SCHOLARSHIP_SHARED_SECRET`. n8n verifies the
 * `X-StartSchool-Signature` header before processing — defends against
 * webhook URL leaks.
 */
import { createHmac } from "crypto";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`n8n scholarship client misconfigured: ${name} is not set`);
  }
  return value;
}

function signBody(body: string): string {
  const secret = requireEnv("N8N_SCHOLARSHIP_SHARED_SECRET");
  return createHmac("sha256", secret).update(body).digest("hex");
}

async function postToN8n<T extends object>(
  url: string,
  payload: T
): Promise<Response> {
  const body = JSON.stringify(payload);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-startschool-signature": signBody(body),
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`n8n webhook ${url} failed: ${res.status} ${text}`);
  }
  return res;
}

export interface RenderPdfInput {
  template_id: "full" | "partial";
  language: "lv" | "en";
  html: string;
}

export async function renderPdf(input: RenderPdfInput): Promise<Buffer> {
  const url = requireEnv("N8N_SCHOLARSHIP_RENDER_PDF_URL");
  const res = await postToN8n(url, input);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("n8n render-pdf returned an empty body");
  }
  return buffer;
}

export interface SendCompletedEmailInput {
  recipient_email: string;
  recipient_name?: string;
  language: "lv" | "en";
  signed_doc_base64: string;
  signed_doc_filename: string;
}

export async function sendCompletedEmail(
  input: SendCompletedEmailInput
): Promise<void> {
  const url = requireEnv("N8N_SCHOLARSHIP_COMPLETED_URL");
  await postToN8n(url, input);
}
