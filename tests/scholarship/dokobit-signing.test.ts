/**
 * Wrapper-level tests for the Dokobit Documents Gateway calls.
 *
 * We mock global fetch so the requests never leave the test runner. The
 * goal isn't end-to-end coverage (that lives in the sandbox E2E gate) —
 * it's to lock in the request-body SHAPE so the wrappers can't silently
 * drift away from the documented Dokobit spec again:
 *
 *   - signing_purpose and signing_options must sit on the signer object,
 *     not at the top level of /api/signing/create.json
 *   - default signing_purpose must be a valid enum value ("signature")
 *   - createBatch must send `signings: [{ token, signer_token }]`, not
 *     a top-level signers array
 *   - the response shape for create.json must tolerate both array and
 *     keyed-object signer forms (Dokobit's docs show keyed-object;
 *     historical responses have used array)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createBatch,
  createSigning,
  type DokobitSigner,
} from "@/lib/dokobit/signing";

const ENV = {
  DOKOBIT_DOCUMENTS_API_KEY: "test-documents-key",
  DOKOBIT_DOCUMENTS_BASE_URL: "https://gateway-sandbox.test",
};

const SIGNER: DokobitSigner = {
  id: "agreement-123",
  name: "Jānis",
  surname: "Bērziņš",
  code: "320198-12345",
  country_code: "LV",
};

interface FetchCall {
  url: string;
  body: Record<string, unknown>;
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
        body: JSON.parse(String(init.body ?? "{}")),
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

describe("createSigning request body", () => {
  it("places signing_purpose and signing_options on the signer, not top-level", async () => {
    const { lastCall } = captureFetch({
      status: "ok",
      token: "signing-token-1",
      signers: [{ id: SIGNER.id, access_token: "signer-access-token" }],
    });

    await createSigning({
      type: "pdf",
      name: "Test agreement",
      fileToken: "file-token-1",
      signer: SIGNER,
      postbackUrl: "https://app.test/webhook",
      language: "en",
    });

    const { body } = lastCall();

    // Top-level must NOT carry signing_purpose / signing_options.
    expect(body).not.toHaveProperty("signing_purpose");
    expect(body).not.toHaveProperty("signing_options");

    // They live on the signer, with the spec-valid defaults.
    const signers = body.signers as Array<Record<string, unknown>>;
    expect(signers).toHaveLength(1);
    expect(signers[0].signing_purpose).toBe("signature");
    expect(signers[0].signing_options).toEqual([
      "smartid",
      "eparaksts_mobile",
      "mobile",
      "stationary",
    ]);

    // Identity fields pass through unchanged.
    expect(signers[0].id).toBe(SIGNER.id);
    expect(signers[0].name).toBe(SIGNER.name);
    expect(signers[0].surname).toBe(SIGNER.surname);
    expect(signers[0].code).toBe(SIGNER.code);
    expect(signers[0].country_code).toBe(SIGNER.country_code);
  });

  it("allows the caller to override signing_purpose and signing_options", async () => {
    const { lastCall } = captureFetch({
      status: "ok",
      token: "signing-token-2",
      signers: [{ id: SIGNER.id, access_token: "tok" }],
    });

    await createSigning({
      type: "pdf",
      name: "Test agreement",
      fileToken: "file-token-2",
      signer: SIGNER,
      postbackUrl: "https://app.test/webhook",
      signingPurpose: "confirmation",
      signingOptions: ["eparaksts_mobile"],
    });

    const { body } = lastCall();
    const signers = body.signers as Array<Record<string, unknown>>;
    expect(signers[0].signing_purpose).toBe("confirmation");
    expect(signers[0].signing_options).toEqual(["eparaksts_mobile"]);
  });

  it("parses the keyed-object response shape documented by Dokobit", async () => {
    const { lastCall } = captureFetch({
      status: "ok",
      token: "signing-token-3",
      signers: {
        "agreement-123": "signer-access-token-from-map",
      },
    });

    const res = await createSigning({
      type: "pdf",
      name: "Test agreement",
      fileToken: "file-token-3",
      signer: SIGNER,
      postbackUrl: "https://app.test/webhook",
    });

    expect(res.token).toBe("signing-token-3");
    expect(res.signers).toEqual([
      { id: "agreement-123", access_token: "signer-access-token-from-map" },
    ]);
    void lastCall;
  });
});

describe("createBatch request body", () => {
  it("sends signings as {token, signer_token} pairs with NO top-level signers array", async () => {
    const { lastCall } = captureFetch({
      status: "ok",
      token: "batch-token-1",
    });

    await createBatch({
      signings: [
        { signing_token: "sig-1", signer_token: "school-tok-1" },
        { signing_token: "sig-2", signer_token: "school-tok-2" },
      ],
      postbackUrl: "https://app.test/webhook",
    });

    const { body } = lastCall();

    expect(body.signings).toEqual([
      { token: "sig-1", signer_token: "school-tok-1" },
      { token: "sig-2", signer_token: "school-tok-2" },
    ]);
    expect(body).not.toHaveProperty("signers");
    expect(body).not.toHaveProperty("signing_options");
    expect(body.postback_url).toBe("https://app.test/webhook");
    expect(body.language).toBe("en");
  });

  it("rejects empty input", async () => {
    await expect(
      createBatch({ signings: [], postbackUrl: "https://app.test/webhook" })
    ).rejects.toThrow(/at least one signing/);
  });

  it("rejects more than 20 signings", async () => {
    const many = Array.from({ length: 21 }, (_, i) => ({
      signing_token: `sig-${i}`,
      signer_token: `tok-${i}`,
    }));
    await expect(
      createBatch({ signings: many, postbackUrl: "https://app.test/webhook" })
    ).rejects.toThrow(/max 20/);
  });

  it("rejects entries missing either signing_token or signer_token", async () => {
    await expect(
      createBatch({
        signings: [{ signing_token: "sig-1", signer_token: "" }],
        postbackUrl: "https://app.test/webhook",
      })
    ).rejects.toThrow(/require both/);
  });
});
