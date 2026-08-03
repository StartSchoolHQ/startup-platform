import { NextResponse } from "next/server";
import {
  createDiplomaSignedUrl,
  getOwnIssuedDiploma,
} from "@/lib/diplomas/data";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const diploma = await getOwnIssuedDiploma(user.id);
    if (!diploma) return NextResponse.json({ diploma: null });
    const url = await createDiplomaSignedUrl(diploma.storage_path);
    return NextResponse.json({
      diploma: {
        diploma_number: diploma.diploma_number,
        issued_at: diploma.issued_at,
      },
      url,
    });
  } catch (e) {
    console.error("diplomas: mine failed", e);
    return NextResponse.json(
      { error: "Failed to load diploma" },
      { status: 500 }
    );
  }
}
