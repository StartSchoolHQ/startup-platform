import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/diplomas/auth";
import { closeBatch } from "@/lib/batches/data";
import { CloseBatchSchema } from "@/lib/validation-schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const parsed = CloseBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(
      await closeBatch(id, parsed.data.userIds, parsed.data.teamIds)
    );
  } catch (e) {
    console.error("batches: close failed", e);
    const msg = e instanceof Error ? e.message : "Failed to close batch";
    const status = /already closed|not found|admin account/i.test(msg)
      ? 409
      : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
