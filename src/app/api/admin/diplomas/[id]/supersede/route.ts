import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/diplomas/auth";
import { supersedeDiploma } from "@/lib/diplomas/data";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid diploma id" }, { status: 400 });
  }

  try {
    await supersedeDiploma(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("diplomas: supersede failed", e);
    return NextResponse.json(
      { error: "Failed to supersede diploma" },
      { status: 500 }
    );
  }
}
