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
  /**
   * Dev-only: when the mock is enabled, encodes a scenario name into the
   * fake session token so `getAuthStatus` returns the corresponding
   * Dokobit error code. Lets the integration-review demo walk through
   * every error path (cancelled, expired, no-account, etc.) without
   * hitting real Dokobit. Ignored when the mock is off.
   * See MOCK_SCENARIOS below for the supported keys.
   */
  mockScenario?: string;
}

/**
 * Dev-mock scenarios → Dokobit error responses surfaced by `getAuthStatus`.
 * Drive scenarios via `?mock=<key>` on the public form URL.
 */
const MOCK_SCENARIOS: Record<
  string,
  { ok: true } | { ok: false; error_code: number; message: string }
> = {
  ok: { ok: true },
  cancelled: {
    ok: false,
    error_code: 7023,
    message: "Signing canceled by user.",
  },
  expired: { ok: false, error_code: 6005, message: "Signing session expired." },
  no_smartid: {
    ok: false,
    error_code: 6006,
    message: "User does not have Smart-ID account.",
  },
  basic_account: {
    ok: false,
    error_code: 6007,
    message: "User can not use Smart-ID account.",
  },
  view_app: {
    ok: false,
    error_code: 6008,
    message: "User should view Smart-ID app or self-service portal",
  },
  no_mobile_id: {
    ok: false,
    error_code: 6001,
    message: "User does not have a mobile signature.",
  },
};

function safeScenarioKey(input: string | undefined): string {
  if (!input) return "ok";
  if (Object.prototype.hasOwnProperty.call(MOCK_SCENARIOS, input)) return input;
  return "ok";
}

export async function createAuthSession(input: CreateAuthSessionInput) {
  // When an explicit `code` is provided (e.g. from `?test_code=...` on
  // the demo URL), bypass the mock and hit real Dokobit — the whole
  // point of test_code is to drive an end-to-end Dokobit + SK Mock
  // Service flow.
  if (mockEnabled() && !input.code) {
    const scenario = safeScenarioKey(input.mockScenario);
    // Encode scenario into the session token so getAuthStatus can pick
    // the matching response. Format: `mock-<scenario>-<random>`.
    const sessionToken = `${MOCK_PREFIX}${scenario}-${randomBytes(8).toString("hex")}`;
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
    // Token format: `mock-<scenario>-<random>`. Strip the prefix, take
    // the first dash-segment as the scenario, default to "ok".
    const tail = sessionToken.slice(MOCK_PREFIX.length);
    const scenarioKey = safeScenarioKey(tail.split("-")[0]);
    const scenario = MOCK_SCENARIOS[scenarioKey];

    if (!scenario.ok) {
      return DokobitAuthStatusResponse.parse({
        status: "error",
        error_code: scenario.error_code,
        message: scenario.message,
      });
    }

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
