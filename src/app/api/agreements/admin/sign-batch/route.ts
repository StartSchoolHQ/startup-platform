/**
 * POST /api/agreements/admin/sign-batch
 *
 * Bundles up to 20 student-signed agreements into a single Dokobit batch
 * signing session. The admin enters ONE PIN with eParaksts Mobile /
 * SmartCard / USB token and all selected docs are countersigned.
 *
 * Smart-ID admins must use the per-doc /sign-single route instead —
 * Smart-ID's protocol mandates a PIN per signature.
 *
 * Body: { ids: string[] } (1..20 UUIDs of rows in `student_signed`)
 * Response: { url } — Dokobit batch UI to open in a new tab
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createBatch } from "@/lib/dokobit/signing";
import { requireAdmin } from "@/lib/scholarship/auth";
import { attachBatch, listAwaitingSchool } from "@/lib/scholarship/data";

// Aligned with the Dokobit integration-review recommendation (≤10).
// See src/lib/dokobit/signing.ts MAX_BATCH_SIZE for the deeper note.
const BATCH_MAX = 10;

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(BATCH_MAX),
});

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`sign-batch misconfigured: ${name} is not set`);
  return value;
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify every selected id is currently in awaiting_school_signature
  // and has both signing tokens populated. Anything else = stale UI
  // selection or webhook hasn't promoted the row yet.
  const queue = await listAwaitingSchool();
  const byId = new Map(queue.map((row) => [row.id, row]));
  const rows = parsed.data.ids.map((id) => byId.get(id));

  if (
    rows.some(
      (row) =>
        !row || !row.dokobit_signing_token || !row.dokobit_school_signer_token
    )
  ) {
    return NextResponse.json(
      {
        error: "invalid_rows",
        message:
          "One or more selected agreements are not ready for batch signing",
      },
      { status: 409 }
    );
  }

  const signings = rows.map((row) => ({
    signing_token: row!.dokobit_signing_token!,
    signer_token: row!.dokobit_school_signer_token!,
  }));
  const origin = new URL(request.url).origin;

  const batch = await createBatch({
    signings,
    postbackUrl: `${origin}/api/webhooks/dokobit`,
    language: "en",
  });

  await attachBatch(parsed.data.ids, batch.token);

  // batch.url is sometimes returned by Dokobit, sometimes we build it.
  const url =
    batch.url ??
    `${requiredEnv("DOKOBIT_DOCUMENTS_BASE_URL")}/signing/batch/${batch.token}`;
  return NextResponse.json({ url });
}
