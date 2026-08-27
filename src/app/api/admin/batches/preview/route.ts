import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/diplomas/auth";
import { getClosePreview } from "@/lib/batches/data";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const batchId = request.nextUrl.searchParams.get("batchId");
  if (!z.string().uuid().safeParse(batchId).success) {
    return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getClosePreview(batchId!));
  } catch (e) {
    console.error("batches: preview failed", e);
    return NextResponse.json(
      { error: "Failed to load batch close preview" },
      { status: 500 }
    );
  }
}
