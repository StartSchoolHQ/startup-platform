/**
 * n8n webhook callers for the scholarship-agreement module.
 *
 * Currently a single webhook:
 *
 * - `sendCompletedEmail` (fire-and-forget): n8n receives the signed `.edoc`
 *   payload (base64) plus recipient details and emails it to the student.
 *
 * PDF rendering moved in-app — see `pdf-render.ts`.
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
  // No-op when n8n isn't configured. Useful for local dev / sandbox
  // testing where we don't run an n8n stack — the signing pipeline
  // still progresses to `archived` without sending the email.
  const url = process.env.N8N_SCHOLARSHIP_COMPLETED_URL;
  if (!url) {
    console.warn(
      "[n8n] N8N_SCHOLARSHIP_COMPLETED_URL not set — skipping completed email"
    );
    return;
  }
  await postToN8n(url, input);
}
