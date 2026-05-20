/**
 * Webhook handler input-validation tests.
 *
 * End-to-end behaviour (state transitions, addSigner, archive, email) is
 * verified manually in the sandbox E2E gate (Task 28) because mocking
 * Dokobit + Supabase + storage inline gets brittle fast. Here we just
 * verify the boundary: malformed payloads are rejected with 400.
 */
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/dokobit/route";

function buildRequest(body: string): Request {
  return new Request("http://localhost/api/webhooks/dokobit", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/webhooks/dokobit — input validation", () => {
  it("rejects malformed JSON with 400", async () => {
    const res = await POST(buildRequest("not-json"));
    expect(res.status).toBe(400);
  });

  it("rejects payloads missing signing_token with 400", async () => {
    const res = await POST(
      buildRequest(JSON.stringify({ event: "signer_signed" }))
    );
    expect(res.status).toBe(400);
  });

  it("rejects empty object with 400", async () => {
    const res = await POST(buildRequest(JSON.stringify({})));
    expect(res.status).toBe(400);
  });
});
