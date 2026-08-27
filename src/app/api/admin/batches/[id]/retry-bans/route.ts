import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/diplomas/auth";
import { retryBans } from "@/lib/batches/data";

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
    return NextResponse.json(await retryBans(id));
  } catch (e) {
    console.error("batches: retry bans failed", e);
    return NextResponse.json(
      { error: "Failed to retry bans" },
      { status: 500 }
    );
  }
}
