import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/diplomas/auth";
import { reopenBatch } from "@/lib/batches/data";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
  }

  try {
    return NextResponse.json(await reopenBatch(id));
  } catch (e) {
    console.error("batches: reopen failed", e);
    const msg = e instanceof Error ? e.message : "Failed to reopen batch";
    const status = /not closed|not found/i.test(msg) ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
