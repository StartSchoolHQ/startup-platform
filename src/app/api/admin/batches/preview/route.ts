import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/diplomas/auth";
import { getClosePreview } from "@/lib/batches/data";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    return NextResponse.json(await getClosePreview());
  } catch (e) {
    console.error("batches: preview failed", e);
    return NextResponse.json(
      { error: "Failed to load batch close preview" },
      { status: 500 }
    );
  }
}
