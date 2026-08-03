import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/diplomas/auth";
import { listDiplomaStudents, updateDiplomaStudent } from "@/lib/diplomas/data";
import { DiplomaStudentUpdateSchema } from "@/lib/validation-schemas";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const students = await listDiplomaStudents();
    return NextResponse.json(students);
  } catch (e) {
    console.error("diplomas: list students failed", e);
    return NextResponse.json(
      { error: "Failed to load students" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = DiplomaStudentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    await updateDiplomaStudent(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("diplomas: update student failed", e);
    return NextResponse.json(
      { error: "Failed to update student" },
      { status: 500 }
    );
  }
}
