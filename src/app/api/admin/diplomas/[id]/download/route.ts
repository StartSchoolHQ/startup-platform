import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/diplomas/auth";
import { createDiplomaSignedUrl } from "@/lib/diplomas/data";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
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
    const { data, error } = await createAdminClient()
      .from("diplomas")
      .select("storage_path")
      .eq("id", id)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Diploma not found" }, { status: 404 });
    }
    const url = await createDiplomaSignedUrl(data.storage_path);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("diplomas: download url failed", e);
    return NextResponse.json(
      { error: "Failed to create download link" },
      { status: 500 }
    );
  }
}
