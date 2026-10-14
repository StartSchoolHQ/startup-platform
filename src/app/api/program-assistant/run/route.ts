import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PROGRAM_SECRET_HEADER } from "@/lib/program-assistant/n8n";
import {
  RUN_IN_PROGRESS,
  runProgramAssistant,
} from "@/lib/program-assistant/run";
import { getProgramAssistantSettings } from "@/lib/program-assistant/settings";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Program assistant daily run. Kicked by pg_cron through
 * `public.program_kick_run_v1` (pg_net, header `x-program-secret` from the
 * vault), or by an admin "Run now" later. No user session is involved: the
 * secret header is the only authentication, compared in constant time.
 *
 * Standalone add-on: the run writes only `qwasar.*` and `program.*` through
 * service-role RPCs; nothing in the platform's core tables is touched.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  kind: z.enum(["scheduled", "adhoc"]).default("scheduled"),
  triggered_by: z.string().uuid().nullish(),
});

function secretMatches(header: string | null): boolean {
  const expected = process.env.PROGRAM_ASSISTANT_SECRET;
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get(PROGRAM_SECRET_HEADER))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: "kind must be scheduled or adhoc" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const settings = await getProgramAssistantSettings(admin);
  if (!settings.enabled) {
    return new Response(null, { status: 204 });
  }

  try {
    const result = await runProgramAssistant(admin, {
      kind: parsed.data.kind,
      triggeredBy: parsed.data.triggered_by ?? null,
    });
    return NextResponse.json(
      {
        run_id: result.runId,
        status: result.status,
        snapshot_date: result.snapshotDate,
        error: result.error ?? null,
        steps: result.steps.map(({ step, status, ms }) => ({
          step,
          status,
          ms,
        })),
      },
      { status: result.status === "done" ? 200 : 500 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes(RUN_IN_PROGRESS)) {
      return NextResponse.json(
        { error: "A run is already in progress" },
        { status: 409 }
      );
    }
    console.error("[program-assistant] run crashed before start", e);
    return NextResponse.json({ error: "run_failed" }, { status: 500 });
  }
}
