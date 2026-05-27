/**
 * Wrapper-level tests for the Dokobit Identity Gateway calls.
 *
 * Locks in the request-body shape so the wrappers can't silently drift
 * away from the Identity Gateway spec (POST /api/authentication/create,
 * GET /api/authentication/{token}/status). End-to-end behaviour is the
 * sandbox E2E gate's job — here we only assert what we send.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthSession, getAuthStatus } from "@/lib/dokobit/identity";

const ENV = {
  DOKOBIT_IDENTITY_API_KEY: "test-identity-key",
  DOKOBIT_IDENTITY_BASE_URL: "https://id-sandbox.test",
};

interface FetchCall {
  url: string;
  method?: string;
  body: Record<string, unknown> | null;
}

function captureFetch(responseBody: unknown): {
  fetchMock: ReturnType<typeof vi.fn>;
  lastCall: () => FetchCall;
} {
  const fetchMock = vi.fn(async () => {
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return {
    fetchMock,
    lastCall: () => {
      const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      return {
        url,
        method: init.method,
        body: init.body ? JSON.parse(String(init.body)) : null,
      };
    },
  };
}

beforeEach(() => {
  for (const [k, v] of Object.entries(ENV)) process.env[k] = v;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createAuthSession", () => {
  it("sends a POST to /api/authentication/create with access_token in the query string", async () => {
    const { lastCall } = captureFetch({
      status: "ok",
      session_token: "session-tok-1",
      url: "https://id-sandbox.test/auth/session-tok-1",
      expires_in: 3600,
    });

    await createAuthSession({
      returnUrl: "https://app.test/agreement/identity-callback",
    });

    const { url, method } = lastCall();
    expect(method).toBe("POST");
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/api/authentication/create");
    expect(parsed.searchParams.get("access_token")).toBe("test-identity-key");
  });

  it("sends only return_url when no optional params are provided", async () => {
    const { lastCall } = captureFetch({
      status: "ok",
      session_token: "tok",
      url: "https://id-sandbox.test/auth/tok",
    });

    await createAuthSession({
      returnUrl: "https://app.test/agreement/identity-callback",
    });

    const { body } = lastCall();
    expect(body).toEqual({
      return_url: "https://app.test/agreement/identity-callback",
    });
  });

  it("threads message, country_code, and authentication_methods into the body", async () => {
    const { lastCall } = captureFetch({
      status: "ok",
      session_token: "tok",
      url: "https://id-sandbox.test/auth/tok",
    });

    await createAuthSession({
      returnUrl: "https://app.test/agreement/identity-callback",
      message: "StartSchool agreement",
      countryCode: "LV",
      authenticationMethods: ["smartid", "eparaksts_mobile", "mobile"],
    });

    const { body } = lastCall();
    expect(body).toEqual({
      return_url: "https://app.test/agreement/identity-callback",
      message: "StartSchool agreement",
      country_code: "LV",
      authentication_methods: ["smartid", "eparaksts_mobile", "mobile"],
    });
  });

  it("rejects a malformed response", async () => {
    captureFetch({ status: "error", message: "boom" });
    await expect(
      createAuthSession({
        returnUrl: "https://app.test/agreement/identity-callback",
      })
    ).rejects.toThrow();
  });
});

describe("getAuthStatus", () => {
  it("parses a successful response and exposes the canonical identity fields", async () => {
    captureFetch({
      status: "ok",
      session_token: "abc",
      certificate: "<base64-encoded-cert>",
      code: "320198-12345",
      country_code: "lv",
      name: "Jānis",
      surname: "Bērziņš",
      authentication_method: "smartid",
      date_authenticated: "2026-05-25T08:00:00+03:00",
    });

    const res = await getAuthStatus("abc");
    expect(res.status).toBe("ok");
    if (res.status === "ok") {
      expect(res.code).toBe("320198-12345");
      expect(res.country_code).toBe("lv");
      expect(res.name).toBe("Jānis");
      expect(res.surname).toBe("Bērziņš");
    }
  });

  it("parses a 'waiting' response without identity fields", async () => {
    captureFetch({ status: "waiting" });
    const res = await getAuthStatus("abc");
    expect(res.status).toBe("waiting");
  });

  it("parses an 'error' response carrying the documented error_code", async () => {
    captureFetch({
      status: "error",
      message: "Signing canceled by user.",
      error_code: 7023,
    });
    const res = await getAuthStatus("abc");
    expect(res.status).toBe("error");
    if (res.status === "error") {
      expect(res.error_code).toBe(7023);
    }
  });
});
