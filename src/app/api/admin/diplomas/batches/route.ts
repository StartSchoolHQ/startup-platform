import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/diplomas/auth";
import { listBatches, upsertBatch } from "@/lib/diplomas/data";
import { DiplomaBatchUpsertSchema } from "@/lib/validation-schemas";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    return NextResponse.json(await listBatches());
  } catch (e) {
    console.error("diplomas: list batches failed", e);
    return NextResponse.json(
      { error: "Failed to load batches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = DiplomaBatchUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await upsertBatch(parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("diplomas: upsert batch failed", e);
    return NextResponse.json(
      { error: "Failed to save batch" },
      { status: 500 }
    );
  }
}
