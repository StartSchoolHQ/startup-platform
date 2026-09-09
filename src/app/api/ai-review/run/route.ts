import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runReview } from "@/lib/ai-review/run-review";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({ review_id: z.string().uuid() });

function secretMatches(header: string | null): boolean {
  const expected = process.env.AI_REVIEW_WORKER_SECRET;
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("x-ai-review-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "review_id (uuid) required" },
      { status: 400 }
    );
  }
  try {
    const admin = createAdminClient();
    // 270 s of the 300 s maxDuration, leaving 30 s of headroom — the model
    // layer uses this to decide whether a parse-retry still fits.
    const out = await runReview(admin, parsed.data.review_id, {
      deadlineAt: Date.now() + 270_000,
    });
    if (!out) return NextResponse.json({ skipped: "not_claimable" });
    return NextResponse.json({
      outcome: out.outcome,
      reject_reason: out.rejectReason,
      cost_usd: out.costUsd,
    });
  } catch (e) {
    // Leave the row in `running`; the sweeper retries (3x) then finalises as failed.
    console.error("[ai-review] run failed", parsed.data.review_id, e);
    return NextResponse.json({ error: "review_failed" }, { status: 500 });
  }
}
