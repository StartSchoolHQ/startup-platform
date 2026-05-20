/**
 * GET    /api/agreements/admin/[id] — detail (agreement row + event timeline)
 * PATCH  /api/agreements/admin/[id] — supports { action: "cancel", reason }
 *
 * 404 to non-admins. The agreement_id must be a valid UUID.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scholarship/auth";
import { cancel, findById, listEvents } from "@/lib/scholarship/data";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const [agreement, events] = await Promise.all([findById(id), listEvents(id)]);
  return NextResponse.json({ data: { agreement, events } });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    reason?: string;
  } | null;

  if (!body || body.action !== "cancel") {
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  }
  if (!body.reason || typeof body.reason !== "string" || !body.reason.trim()) {
    return NextResponse.json({ error: "reason_required" }, { status: 400 });
  }

  const updated = await cancel(id, body.reason.trim());
  return NextResponse.json({ data: updated });
}
