/**
 * GET    /api/agreements/admin/[id] — detail (agreement row + event timeline)
 * PATCH  /api/agreements/admin/[id] — admin state changes:
 *   { action: "cancel", reason }              → scholarship_cancel
 *   { action: "set_status", status, reason? } → scholarship_set_outcome_v1
 *     status: dropped_out | terminated_by_school (reason required)
 *           | archived (revert a mistaken outcome; reason ignored/cleared)
 *
 * 404 to non-admins. The agreement_id must be a valid UUID. Transition
 * violations surface as 409 { error: "invalid_transition" }.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/scholarship/auth";
import {
  cancel,
  findById,
  listEvents,
  setOutcome,
} from "@/lib/scholarship/data";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("cancel"),
    reason: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal("set_status"),
    status: z.enum(["dropped_out", "terminated_by_school", "archived"]),
    reason: z.string().trim().min(1).optional(),
  }),
]);

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

  const parsed = PatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const body = parsed.data;

  try {
    if (body.action === "cancel") {
      const updated = await cancel(id, body.reason);
      return NextResponse.json({ data: updated });
    }

    // set_status: marking an outcome needs a reason; reverting to archived
    // clears it (the audit trail keeps the original in status_changed events).
    if (body.status !== "archived" && !body.reason) {
      return NextResponse.json({ error: "reason_required" }, { status: 400 });
    }
    const updated = await setOutcome({
      id,
      status: body.status,
      reason: body.status === "archived" ? null : (body.reason ?? null),
    });
    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("scholarship_state_transition_denied")) {
      return NextResponse.json(
        { error: "invalid_transition" },
        { status: 409 }
      );
    }
    if (message.includes("scholarship_not_found")) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("[agreements/admin/:id] PATCH failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
