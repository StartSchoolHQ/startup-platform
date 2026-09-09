/**
 * Dry-run the AI reviewer against historical TEAM submissions that already have
 * a human decision, and measure agreement. Writes nothing to the database.
 *
 *   npm run ai-review:calibrate -- --rejected 29 --approved 31 [--threshold 0.75] [--model gpt-5.4]
 */
import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { normalizeSubmission } from "../src/lib/ai-review/normalize";
import { parseAiReviewSettings } from "../src/lib/ai-review/settings";
import { runReviewOnSnapshot } from "../src/lib/ai-review/run-review";
import type { CriteriaSnapshot } from "../src/lib/ai-review/types";

config({ path: ".env.local" });

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const nRejected = Number(arg("rejected", "29"));
  const nApproved = Number(arg("approved", "31"));

  const { data: settingsRow } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "ai_review")
    .single();
  const settings = parseAiReviewSettings(settingsRow?.value);
  settings.confidenceThreshold = Number(
    arg("threshold", String(settings.confidenceThreshold))
  );
  settings.model = arg("model", settings.model);

  const select = `id, status, submission_data, peer_review_history, tasks!inner(id, title, description, deliverables, peer_review_criteria, review_instructions)`;
  const { data: rejected } = await admin
    .from("task_progress")
    .select(select)
    .eq("context", "team")
    .eq("status", "rejected")
    .not("submission_data", "is", null)
    .order("updated_at", { ascending: false })
    .limit(nRejected);
  const { data: approvedAll } = await admin
    .from("task_progress")
    .select(select)
    .eq("context", "team")
    .eq("status", "approved")
    .not("submission_data", "is", null)
    .order("updated_at", { ascending: false })
    .limit(nApproved * 4);
  // approved rows that were never rejected (clean positives)
  const approved = (approvedAll ?? [])
    .filter(
      (r) => !JSON.stringify(r.peer_review_history ?? []).includes('"rejected"')
    )
    .slice(0, nApproved);

  const rows = [
    ...(rejected ?? []).map((r) => ({ ...r, human: "rejected" as const })),
    ...approved.map((r) => ({ ...r, human: "approved" as const })),
  ];
  const results: Array<Record<string, unknown>> = [];
  let cost = 0;

  for (const [i, r] of rows.entries()) {
    const t = r.tasks as unknown as {
      id: string;
      title: string;
      description: string | null;
      deliverables: string[] | null;
      peer_review_criteria: unknown;
      review_instructions: string | null;
    };
    const criteria: CriteriaSnapshot = {
      title: t.title,
      description: t.description,
      deliverables: t.deliverables ?? [],
      review_instructions: t.review_instructions,
      criteria: Array.isArray(t.peer_review_criteria)
        ? (t.peer_review_criteria as CriteriaSnapshot["criteria"])
        : [],
    };
    const snapshot = normalizeSubmission(r.submission_data);
    const started = Date.now();
    try {
      const out = await runReviewOnSnapshot(snapshot, criteria, settings);
      cost += out.costUsd;
      const ai = out.outcome;
      results.push({
        progress_id: r.id,
        task: t.title,
        human: r.human,
        ai,
        agree: ai === r.human,
        false_approval: r.human === "rejected" && ai === "approved",
        reject_reason: out.rejectReason,
        confidence: out.result?.confidence,
        unverifiable: out.result?.unverifiable_evidence,
        cost_usd: out.costUsd,
        ms: Date.now() - started,
        feedback: out.feedback,
        manifest: out.manifest.map((m) => `${m.id}:${m.status}`).join(" "),
      });
      console.log(
        `${i + 1}/${rows.length} ${r.human.padEnd(8)} → ${ai.padEnd(8)} conf=${out.result?.confidence?.toFixed(2)} $${out.costUsd} ${t.title}`
      );
    } catch (e) {
      results.push({
        progress_id: r.id,
        task: t.title,
        human: r.human,
        ai: "error",
        error: e instanceof Error ? e.message : String(e),
      });
      console.log(
        `${i + 1}/${rows.length} ${r.human} → ERROR ${t.title}: ${e instanceof Error ? e.message : e}`
      );
    }
  }

  const scored = results.filter((r) => r.ai !== "error");
  const summary = {
    n: results.length,
    errors: results.length - scored.length,
    agreement:
      scored.filter((r) => r.agree).length / Math.max(1, scored.length),
    false_approvals: scored.filter((r) => r.false_approval).length,
    false_rejections: scored.filter(
      (r) => r.human === "approved" && r.ai === "rejected"
    ).length,
    unverifiable_rejects: scored.filter(
      (r) => r.reject_reason === "unverifiable_evidence"
    ).length,
    low_confidence_rejects: scored.filter(
      (r) => r.reject_reason === "low_confidence"
    ).length,
    mean_conf_human_approved: avg(
      scored
        .filter((r) => r.human === "approved")
        .map((r) => Number(r.confidence))
    ),
    mean_conf_human_rejected: avg(
      scored
        .filter((r) => r.human === "rejected")
        .map((r) => Number(r.confidence))
    ),
    total_cost_usd: Number(cost.toFixed(3)),
    cost_per_review: Number((cost / Math.max(1, scored.length)).toFixed(4)),
    threshold: settings.confidenceThreshold,
    model: settings.model,
  };
  console.table(summary);

  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 13);
  mkdirSync("reports", { recursive: true });
  writeFileSync(
    `reports/ai-review-calibration-${stamp}.json`,
    JSON.stringify({ summary, results }, null, 2)
  );
  const cols = [
    "progress_id",
    "task",
    "human",
    "ai",
    "agree",
    "false_approval",
    "reject_reason",
    "confidence",
    "unverifiable",
    "cost_usd",
    "ms",
  ];
  writeFileSync(
    `reports/ai-review-calibration-${stamp}.csv`,
    [
      cols.join(","),
      ...results.map((r) =>
        cols.map((c) => JSON.stringify(r[c] ?? "")).join(",")
      ),
    ].join("\n")
  );
}

function avg(xs: number[]): number {
  const v = xs.filter((x) => !Number.isNaN(x));
  return v.length
    ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(3))
    : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
