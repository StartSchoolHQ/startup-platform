import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/ai-review/run-review", () => ({ runReview: vi.fn() }));

describe("POST /api/ai-review/run", () => {
  it("returns 401 without the shared secret", async () => {
    process.env.AI_REVIEW_WORKER_SECRET = "s3cret";
    const { POST } = await import("@/app/api/ai-review/run/route");
    const res = await POST(
      new Request("http://x/api/ai-review/run", {
        method: "POST",
        body: JSON.stringify({ review_id: crypto.randomUUID() }),
      })
    );
    expect(res.status).toBe(401);
  });
  it("returns 400 on a malformed body", async () => {
    process.env.AI_REVIEW_WORKER_SECRET = "s3cret";
    const { POST } = await import("@/app/api/ai-review/run/route");
    const res = await POST(
      new Request("http://x/api/ai-review/run", {
        method: "POST",
        headers: { "x-ai-review-secret": "s3cret" },
        body: "{}",
      })
    );
    expect(res.status).toBe(400);
  });
});
