/**
 * Posts the digest through a Slack incoming webhook. The URL is a secret
 * (anyone holding it can post to the channel), so it lives only in the
 * `SLACK_WEBHOOK_URL` env var and is never written to the database.
 */

export class SlackPostError extends Error {}

export function slackWebhookUrl(): string | null {
  const url = process.env.SLACK_WEBHOOK_URL?.trim();
  return url && url.startsWith("https://hooks.slack.com/") ? url : null;
}

export interface PostDigestOptions {
  webhookUrl: string;
  text: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** Slack answers the literal `ok` with 200; anything else is an error. */
export async function postDigestToSlack(
  opts: PostDigestOptions
): Promise<void> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  try {
    const res = await fetchImpl(opts.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: opts.text, unfurl_links: false }),
      signal: controller.signal,
    });
    const body = await res.text().catch(() => "");
    if (!res.ok) {
      throw new SlackPostError(
        `Slack webhook answered ${res.status}: ${body.slice(0, 200)}`
      );
    }
  } catch (e) {
    if (e instanceof SlackPostError) throw e;
    throw new SlackPostError(
      `Slack webhook unreachable: ${e instanceof Error ? e.message : String(e)}`
    );
  } finally {
    clearTimeout(timer);
  }
}
