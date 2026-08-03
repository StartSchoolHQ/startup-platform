import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/diplomas/auth";
import { listIssuedDiplomas } from "@/lib/diplomas/data";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    return NextResponse.json(await listIssuedDiplomas());
  } catch (e) {
    console.error("diplomas: list issued failed", e);
    return NextResponse.json(
      { error: "Failed to load diplomas" },
      { status: 500 }
    );
  }
}
