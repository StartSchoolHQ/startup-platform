/**
 * POST /api/agreements/submit-form
 *
 * Public endpoint hit by the scholarship landing pages after the student
 * fills the form (email × 2, phone, address). Server-side flow:
 *
 *   1. Validate the body against ScholarshipFormSchema.
 *   2. Mint a Dokobit Identity Gateway auth session (`createAuthSession`)
 *      with our `/agreement/identity-callback` as the return URL.
 *   3. Persist a draft scholarship_agreements row keyed by the Dokobit
 *      session_token (the eID callback will look the row up by that key).
 *   4. Return `{ redirect_url }` — the client navigates to Dokobit.
 *
 * The Dokobit session_token IS the correlation key — no per-row access
 * token is exposed to the URL.
 */
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAuthSession } from "@/lib/dokobit/identity";
import { submitFormV3 } from "@/lib/scholarship/data";
import { ScholarshipFormSchema } from "@/lib/validation-schemas";

const DRAFT_EXPIRY_DAYS = 14;

export async function POST(request: Request) {
  let parsed;
  try {
    const body = await request.json();
    parsed = ScholarshipFormSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "validation_failed", details: err.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  // OUR correlation key. Dokobit's create-session token and the token it
  // appends to the callback differ, so we can't key the row by a Dokobit
  // token — we embed this ref in the return_url and look the row up by it.
  const callbackRef = randomBytes(24).toString("hex");
  const returnUrl = `${origin}/agreement/identity-callback?ref=${callbackRef}`;
  // Dev-only: when DOKOBIT_IDENTITY_MOCK=true, ?mock=<scenario> on the
  // form URL drives which Dokobit response the mock returns (ok,
  // cancelled, expired, no_smartid, basic_account, view_app,
  // no_mobile_id). Ignored in prod (the mock branch in createAuthSession
  // is gated by env flag).
  const mockScenario = requestUrl.searchParams.get("mock") ?? undefined;
  // Review-prep: ?test_code=<LV personal code> prefills Dokobit's `code`
  // param, which Dokobit forwards to SK as the document number
  // (PNOLV-<code>-MOCK-Q). For SK Mock Service test users (e.g.
  // 030403-10016 = USER_REFUSED) this auto-resolves through real Dokobit
  // — no mock involvement. List of supported codes:
  // https://sk-eid.github.io/smart-id-documentation/test_accounts.html
  const testCode = requestUrl.searchParams.get("test_code") ?? undefined;

  // Mint the Dokobit auth session BEFORE the DB write so the session_token
  // is available as the row's correlation key from the start.
  //
  // In dev with DOKOBIT_IDENTITY_MOCK=true, `createAuthSession` short-
  // circuits and returns a fake session whose `url` points back to our
  // own identity-callback page with a `mock-...` session token. The
  // matching `getAuthStatus` returns hardcoded test identity. Lets us
  // exercise the entire pipeline (PDF render → signing upload → archive)
  // without a working Dokobit eID sandbox setup. The flag is server-only
  // and impossible to enable in prod by mistake (no NEXT_PUBLIC_ prefix).
  const session = await createAuthSession({
    returnUrl,
    countryCode: "LV",
    authenticationMethods: ["smartid", "eparaksts_mobile", "smartcard"],
    message: "StartSchool agreement",
    mockScenario,
    code: testCode,
  });

  const expiresAt = new Date(
    Date.now() + DRAFT_EXPIRY_DAYS * 86_400_000
  ).toISOString();

  const row = await submitFormV3({
    agreement_type: parsed.agreement_type,
    email: parsed.email,
    phone: parsed.phone,
    address: parsed.address,
    birthdate: parsed.birthdate,
    language: parsed.language,
    callback_ref: callbackRef,
    expires_at: expiresAt,
  });

  return NextResponse.json({ id: row.id, redirect_url: session.url });
}
