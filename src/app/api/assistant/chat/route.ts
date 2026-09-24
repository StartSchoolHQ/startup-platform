import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AssistantChatSchema } from "@/lib/validation-schemas";
import { getOpenAI } from "@/lib/ai-review/openai-client";
import { estimateCostUsd } from "@/lib/ai/pricing";
import { streamStartieReply, type HistoryTurn } from "@/lib/assistant/chat";
import { mapAssistantRpcError } from "@/lib/assistant/errors";
import { nextUtcMidnight } from "@/lib/assistant/limits";
import {
  buildContextMessage,
  buildStaticSystemPrompt,
  newPromptNonce,
  PROMPT_VERSION,
} from "@/lib/assistant/prompt";
import { getAssistantSettings } from "@/lib/assistant/settings";
import { loadPageSummary, loadStudentSnapshot } from "@/lib/assistant/snapshot";

export const maxDuration = 60;

const APOLOGY =
  "Startie hit a snag and couldn't finish that reply. Try again in a moment.";

interface SendResult {
  thread_id: string;
  message_id: string;
  remaining_today: number | null;
}

/**
 * One student message in, one streamed Startie reply out. The daily limit is
 * enforced by `assistant_send_message_v1` (student session); the reply row
 * is written with the service role once the stream ends.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const settings = await getAssistantSettings(supabase);
    if (!settings.enabled) {
      return NextResponse.json(
        { error: "Startie is switched off right now." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = AssistantChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid message",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const { threadId, content, pageContext } = parsed.data;

    const rpc = await supabase.rpc("assistant_send_message_v1", {
      // Generated types mark uuid args non-null; the SQL accepts null (= new thread).
      p_thread_id: (threadId ?? null) as unknown as string,
      p_content: content,
      p_page_context: pageContext,
    });
    if (rpc.error) {
      const mapped = mapAssistantRpcError(rpc.error.message);
      const extra =
        mapped.status === 429
          ? { remaining: 0, resetsAt: nextUtcMidnight().toISOString() }
          : {};
      return NextResponse.json(
        { error: mapped.error, ...extra },
        { status: mapped.status }
      );
    }
    const sent = rpc.data as unknown as SendResult;

    const [snapshot, page, historyRes] = await Promise.all([
      loadStudentSnapshot(supabase, user.id),
      loadPageSummary(supabase, pageContext),
      supabase
        .from("assistant_messages")
        .select("role, content")
        .eq("thread_id", sent.thread_id)
        .in("role", ["user", "assistant"])
        .order("created_at", { ascending: false })
        .limit(settings.historyTurns * 2),
    ]);
    if (historyRes.error) {
      throw new Error(`history: ${historyRes.error.message}`);
    }
    const history: HistoryTurn[] = [...historyRes.data].reverse().map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const reply = streamStartieReply({
      openai: getOpenAI().withOptions({ timeout: 45_000, maxRetries: 0 }),
      model: settings.model,
      effort: settings.reasoningEffort,
      system: buildStaticSystemPrompt(),
      context: buildContextMessage(snapshot, page, newPromptNonce()),
      history,
      promptCacheKey: `startie:${PROMPT_VERSION}`,
    });

    const admin = createAdminClient();
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let streamed = "";
        try {
          let next = await reply.next();
          while (!next.done) {
            streamed += next.value;
            controller.enqueue(encoder.encode(next.value));
            next = await reply.next();
          }
          const final = next.value;
          const { error } = await admin.from("assistant_messages").insert({
            thread_id: sent.thread_id,
            user_id: user.id,
            role: "assistant",
            content: final.text,
            model: final.model,
            input_tokens: final.usage.input,
            cached_tokens: final.usage.cached,
            output_tokens: final.usage.output,
            cost_usd: estimateCostUsd(settings.model, final.usage),
            prompt_version: PROMPT_VERSION,
          });
          if (error) throw new Error(`reply insert: ${error.message}`);
        } catch (e) {
          console.error("[assistant] reply failed", e);
          Sentry.captureException(e);
          const tail = `${streamed ? "\n\n" : ""}_${APOLOGY}_`;
          controller.enqueue(encoder.encode(tail));
          await admin
            .from("assistant_messages")
            .insert({
              thread_id: sent.thread_id,
              user_id: user.id,
              role: "assistant",
              content: `${streamed}${tail}`.trim(),
              model: null,
              cost_usd: 0,
              prompt_version: PROMPT_VERSION,
            })
            .then(({ error }) => {
              if (error) console.error("[assistant] apology insert", error);
            });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Startie-Thread-Id": sent.thread_id,
        "X-Startie-Remaining":
          sent.remaining_today === null ? "" : String(sent.remaining_today),
      },
    });
  } catch (error) {
    console.error("[assistant] chat route", error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Startie couldn't take that message. Try again in a moment." },
      { status: 500 }
    );
  }
}
