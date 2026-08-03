import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/diplomas/auth";
import {
  claimDiplomaNumber,
  getBatch,
  getDiplomaData,
  getDiplomaStudent,
  issueDiploma,
} from "@/lib/diplomas/data";
import { renderHtmlToPdf } from "@/lib/diplomas/pdf-render";
import { renderDiplomaHtml } from "@/lib/diplomas/pdf-template";
import { buildSnapshot } from "@/lib/diplomas/snapshot";
import { DiplomaIssueSchema } from "@/lib/validation-schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = DiplomaIssueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { user_id, batch_id } = parsed.data;

  try {
    const [rpc, batch, student] = await Promise.all([
      getDiplomaData(user_id),
      getBatch(batch_id),
      getDiplomaStudent(user_id),
    ]);
    const diplomaType = student.startup_module_completed
      ? ("full" as const)
      : ("tech_only" as const);
    const issuedDate = new Date().toISOString().slice(0, 10);

    // Validate prerequisites BEFORE claiming a number so failed attempts
    // don't burn sequence numbers.
    try {
      buildSnapshot({
        rpc,
        batch,
        diplomaNumber: "PENDING",
        diplomaType,
        issuedDate,
      });
    } catch (e) {
      const code = e instanceof Error ? e.message : "unknown";
      if (code.startsWith("missing_")) {
        return NextResponse.json({ error: code }, { status: 422 });
      }
      throw e;
    }

    const diplomaNumber = await claimDiplomaNumber(batch_id);
    const snapshot = buildSnapshot({
      rpc,
      batch,
      diplomaNumber,
      diplomaType,
      issuedDate,
    });
    const pdf = await renderHtmlToPdf(renderDiplomaHtml(snapshot));
    const row = await issueDiploma({
      userId: user_id,
      batchId: batch_id,
      adminId: admin.id,
      pdf,
      snapshot,
      diplomaNumber,
      diplomaType,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error("diplomas: issue failed", e);
    return NextResponse.json(
      { error: "Failed to issue diploma" },
      { status: 500 }
    );
  }
}
