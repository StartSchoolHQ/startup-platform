/**
 * Dokobit Identity Gateway wrapper.
 *
 * Two operations:
 * - `createAuthSession` — opens an eID authentication session and returns
 *   the URL we redirect the student to (Smart-ID, eParaksts Mobile, ID card,
 *   etc. — Dokobit's hosted UI lets the user pick).
 * - `getAuthStatus` — polled or called on the return callback to retrieve
 *   the authenticated person's name, surname, personal code and country.
 *
 * Never call `fetch` against Dokobit URLs from outside this module.
 *
 * DEV MOCK: when `DOKOBIT_IDENTITY_MOCK=true`, both functions short-circuit
 * with hardcoded test data instead of hitting Dokobit. Server-only flag
 * (no NEXT_PUBLIC_ prefix), so it cannot be enabled from the client.
 */
import { randomBytes } from "crypto";
import { dokobitFetch } from "./client";
import {
  DokobitAuthStatus,
  DokobitAuthStatusResponse,
  DokobitCreateAuthSessionResponse,
} from "./types";

const MOCK_PREFIX = "mock-";

function mockEnabled(): boolean {
  return process.env.DOKOBIT_IDENTITY_MOCK === "true";
}

export type DokobitAuthMethod =
  | "mobile"
  | "smartid"
  | "smartcard"
  | "eparaksts_mobile"
  | "audkenni_app";

interface CreateAuthSessionInput {
  returnUrl: string;
  message?: string;
  countryCode?: string;
  authenticationMethods?: DokobitAuthMethod[];
  /**
   * Personal code to prefill Mobile-ID / Smart-ID form data. Per Dokobit's
   * spec; for Smart-ID this maps to the SK document number when combined
   * with country_code (e.g. code="040404-10003" + country_code="LV" →
   * PNOLV-040404-10003-DEMO-Q). Useful for hitting SK Mock Service test
   * users like the ones at sk-eid.github.io/smart-id-documentation/test_accounts.html.
   */
  code?: string;
  /** Phone number to prefill Mobile-ID form data. */
  phone?: string;
}

export async function createAuthSession(input: CreateAuthSessionInput) {
  if (mockEnabled()) {
    const sessionToken = MOCK_PREFIX + randomBytes(16).toString("hex");
    const url = new URL(input.returnUrl);
    url.searchParams.set("session_token", sessionToken);
    return DokobitCreateAuthSessionResponse.parse({
      status: "ok",
      session_token: sessionToken,
      url: url.toString(),
    });
  }

  const body: Record<string, unknown> = { return_url: input.returnUrl };
  if (input.message) body.message = input.message;
  if (input.countryCode) body.country_code = input.countryCode;
  if (input.code) body.code = input.code;
  if (input.phone) body.phone = input.phone;
  if (input.authenticationMethods?.length) {
    body.authentication_methods = input.authenticationMethods;
  }

  const raw = await dokobitFetch<unknown>({
    product: "identity",
    method: "POST",
    path: "/api/authentication/create",
    body,
  });
  return DokobitCreateAuthSessionResponse.parse(raw);
}

export async function getAuthStatus(
  sessionToken: string
): Promise<DokobitAuthStatus> {
  if (mockEnabled() && sessionToken.startsWith(MOCK_PREFIX)) {
    // SK notification-flow test user PNOLV-050405-10009-DEM0-Q ("Adult,
    // OK" in Notification flows). Dokobit Documents Gateway signing
    // uses notification flow (control code + phone push), so this pool
    // is what its sandbox can auto-resolve. Device-link test users
    // (e.g. 040404-10003) don't auto-respond for signing.
    //
    // Name + surname here match the actual subject on the SK test
    // cert — the signing UI confirms "Certificate owner: OK TEST" — so
    // the PDF text and the cryptographic signature reference the same
    // person rather than diverging.
    return DokobitAuthStatusResponse.parse({
      status: "ok",
      code: "050405-10009",
      country_code: "LV",
      name: "OK",
      surname: "TEST",
      authentication_method: "smartid",
      date_authenticated: new Date().toISOString(),
    });
  }

  const raw = await dokobitFetch<unknown>({
    product: "identity",
    method: "GET",
    path: `/api/authentication/${sessionToken}/status`,
  });
  return DokobitAuthStatusResponse.parse(raw);
}
