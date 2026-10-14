/**
 * n8n webhook callers for the program assistant.
 *
 * Three workflows, all behind an n8n Header Auth credential whose header is
 * `x-program-secret` and whose value equals `PROGRAM_ASSISTANT_SECRET` (the
 * same value the Supabase vault and the run route use). The readers respond
 * only when their last node finished, so the run can store their counts.
 */

export const PROGRAM_SECRET_HEADER = "x-program-secret";

export const WEBHOOK_PATHS = {
  attendanceSync: "/program/attendance-sync",
  trackSync: "/program/track-sync",
  alert: "/program/alert",
} as const;

export class N8nWebhookError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly body: unknown
  ) {
    super(message);
  }
}

export interface WebhookCallOptions {
  base: string;
  path: string;
  secret: string;
  body?: Record<string, unknown>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** POSTs to an n8n webhook and returns its JSON. Throws on non-2xx or `ok: false`. */
export async function callProgramWebhook(
  opts: WebhookCallOptions
): Promise<Record<string, unknown>> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `${opts.base.replace(/\/+$/, "")}${opts.path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PROGRAM_SECRET_HEADER]: opts.secret,
      },
      body: JSON.stringify(opts.body ?? {}),
      signal: controller.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 500) };
    }
    if (!res.ok) {
      throw new N8nWebhookError(
        `${opts.path} answered ${res.status}`,
        res.status,
        json
      );
    }
    const obj =
      json && typeof json === "object" && !Array.isArray(json)
        ? (json as Record<string, unknown>)
        : { result: json };
    if (obj.ok === false) {
      throw new N8nWebhookError(
        `${opts.path} reported failure: ${String(obj.error ?? "unknown")}`,
        res.status,
        obj
      );
    }
    return obj;
  } catch (e) {
    if (e instanceof N8nWebhookError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new N8nWebhookError(`${opts.path} unreachable: ${msg}`, null, null);
  } finally {
    clearTimeout(timer);
  }
}

export interface AlertOptions {
  base: string;
  secret: string;
  subject: string;
  text: string;
  fetchImpl?: typeof fetch;
}

/** Best effort: logs instead of throwing, alerts must never break the run. */
export async function sendProgramAlert(opts: AlertOptions): Promise<boolean> {
  if (!opts.base || !opts.secret) {
    console.warn("[program-assistant] alert skipped: n8n base or secret unset");
    return false;
  }
  try {
    await callProgramWebhook({
      base: opts.base,
      path: WEBHOOK_PATHS.alert,
      secret: opts.secret,
      body: { subject: opts.subject, text: opts.text },
      timeoutMs: 20_000,
      fetchImpl: opts.fetchImpl,
    });
    return true;
  } catch (e) {
    console.error("[program-assistant] alert failed", e);
    return false;
  }
}
