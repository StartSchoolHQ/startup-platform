import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/diplomas/auth";
import {
  getBatch,
  getDiplomaData,
  getDiplomaStudent,
} from "@/lib/diplomas/data";
import { checkReadiness } from "@/lib/diplomas/snapshot";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const batchId = url.searchParams.get("batchId");
  if (!userId || !batchId) {
    return NextResponse.json(
      { error: "userId and batchId are required" },
      { status: 400 }
    );
  }

  try {
    const [rpc, batch, student] = await Promise.all([
      getDiplomaData(userId),
      getBatch(batchId),
      getDiplomaStudent(userId),
    ]);
    return NextResponse.json({
      data: rpc,
      readiness: checkReadiness(rpc, batch),
      diploma_type: student.startup_module_completed ? "full" : "tech_only",
    });
  } catch (e) {
    console.error("diplomas: preview failed", e);
    return NextResponse.json(
      { error: "Failed to compute preview" },
      { status: 500 }
    );
  }
}
