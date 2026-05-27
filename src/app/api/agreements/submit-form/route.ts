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
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAuthSession } from "@/lib/dokobit/identity";
import { submitForm } from "@/lib/scholarship/data";
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

  const origin = new URL(request.url).origin;
  const returnUrl = `${origin}/agreement/identity-callback`;

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
  });

  const expiresAt = new Date(
    Date.now() + DRAFT_EXPIRY_DAYS * 86_400_000
  ).toISOString();

  const row = await submitForm({
    agreement_type: parsed.agreement_type,
    email: parsed.email,
    phone: parsed.phone,
    address: parsed.address,
    language: parsed.language,
    dokobit_auth_token: session.session_token,
    expires_at: expiresAt,
  });

  return NextResponse.json({ id: row.id, redirect_url: session.url });
}
