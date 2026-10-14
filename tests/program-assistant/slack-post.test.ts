import { afterEach, describe, expect, it } from "vitest";
import {
  postDigestToSlack,
  SlackPostError,
  slackWebhookUrl,
} from "@/lib/program-assistant/slack-post";

const URL = "https://hooks.slack.com/services/T1/B1/x";

describe("slackWebhookUrl", () => {
  const original = process.env.SLACK_WEBHOOK_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.SLACK_WEBHOOK_URL;
    else process.env.SLACK_WEBHOOK_URL = original;
  });

  it("accepts only hooks.slack.com URLs", () => {
    process.env.SLACK_WEBHOOK_URL = URL;
    expect(slackWebhookUrl()).toBe(URL);
    process.env.SLACK_WEBHOOK_URL = "https://evil.test/hook";
    expect(slackWebhookUrl()).toBeNull();
    delete process.env.SLACK_WEBHOOK_URL;
    expect(slackWebhookUrl()).toBeNull();
  });
});

describe("postDigestToSlack", () => {
  it("posts the text as JSON and resolves on ok", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), body: String(init?.body) });
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
    await postDigestToSlack({ webhookUrl: URL, text: "*hello*", fetchImpl });
    expect(calls[0].url).toBe(URL);
    expect(JSON.parse(calls[0].body)).toEqual({
      text: "*hello*",
      unfurl_links: false,
    });
  });

  it("throws SlackPostError on a non-2xx answer", async () => {
    const fetchImpl = (async () =>
      new Response("invalid_payload", { status: 400 })) as typeof fetch;
    await expect(
      postDigestToSlack({ webhookUrl: URL, text: "x", fetchImpl })
    ).rejects.toBeInstanceOf(SlackPostError);
  });
});
