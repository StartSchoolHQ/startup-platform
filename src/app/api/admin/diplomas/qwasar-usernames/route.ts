import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/diplomas/auth";
import { applyUsernameMapping } from "@/lib/diplomas/data";
import { UsernameMappingUploadSchema } from "@/lib/validation-schemas";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = UsernameMappingUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await applyUsernameMapping(parsed.data.rows);
    return NextResponse.json(result);
  } catch (e) {
    console.error("diplomas: username mapping upload failed", e);
    return NextResponse.json(
      { error: "Failed to apply username mapping" },
      { status: 500 }
    );
  }
}
