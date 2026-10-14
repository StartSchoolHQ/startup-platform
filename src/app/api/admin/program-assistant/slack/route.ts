import { NextResponse } from "next/server";
import {
  postDigestToSlack,
  slackWebhookUrl,
} from "@/lib/program-assistant/slack-post";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin "Post to Slack": sends the latest successful run's digest through
 * the incoming webhook and stamps `slack_posted_at`. Manual runs never post
 * on their own; this button is the only way an ad-hoc digest reaches Slack.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("primary_role")
    .eq("id", user.id)
    .single();
  if (profile?.primary_role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const webhookUrl = slackWebhookUrl();
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "SLACK_WEBHOOK_URL is not set on the server" },
      { status: 503 }
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("program_run_digest_v1", {});
    if (error) throw new Error(error.message);
    const run = data as {
      id: string;
      slack_message: string | null;
      snapshot_date: string | null;
    } | null;
    if (!run?.slack_message) {
      return NextResponse.json(
        { error: "No digest to post yet; run the assistant first" },
        { status: 409 }
      );
    }
    await postDigestToSlack({ webhookUrl, text: run.slack_message });
    const { data: postedAt, error: markError } = await admin.rpc(
      "program_run_mark_posted_v1",
      { p_run_id: run.id }
    );
    if (markError) console.error("[program-assistant] mark posted", markError);
    return NextResponse.json({
      ok: true,
      run_id: run.id,
      snapshot_date: run.snapshot_date,
      posted_at: postedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[program-assistant] slack post failed", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
