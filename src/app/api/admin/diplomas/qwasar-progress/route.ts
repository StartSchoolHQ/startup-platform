import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/diplomas/auth";
import { upsertQwasarProgress } from "@/lib/diplomas/data";
import { QwasarProgressUploadSchema } from "@/lib/validation-schemas";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = QwasarProgressUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await upsertQwasarProgress(parsed.data.rows);
    return NextResponse.json(result);
  } catch (e) {
    console.error("diplomas: qwasar progress upload failed", e);
    return NextResponse.json(
      { error: "Failed to upsert Qwasar progress" },
      { status: 500 }
    );
  }
}
