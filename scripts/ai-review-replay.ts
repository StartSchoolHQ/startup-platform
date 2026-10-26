/**
 * Replay past AI reviews as a DRY RUN (writes nothing, captures no telemetry)
 * with the code's current persona — and, with --fresh-criteria, the tasks'
 * current criteria — so a prompt or criteria change can be checked against
 * real submissions before it ships.
 *
 *   npm run ai-review:replay -- --codes MJ-P1-01,MJ-P1-03,MJ-READ- --sole E1 [--fresh-criteria] [--limit 40] [--model gpt-5.4]
 *   npm run ai-review:replay -- --ids <review uuid>,<review uuid>
 *
 * --codes            task template_code prefixes, comma-separated (default: all)
 * --sole <id>        only rows where that criterion was the single failed one
 * --ids              explicit ai_task_reviews ids (overrides --codes / --sole / --status)
 * --status           rejected (default) | approved | all
 * --fresh-criteria   grade against tasks.peer_review_criteria as it is now
 * --no-previous      replay with an empty previous_submissions list (what the
 *                    RPC feeds since 2026-10-26 for a row with no approved cycle)
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { parseAiReviewSettings } from "../src/lib/ai-review/settings";
import { runReviewOnSnapshot } from "../src/lib/ai-review/run-review";
import type {
  CriteriaSnapshot,
  NormalizedSubmission,
} from "../src/lib/ai-review/types";

config({ path: ".env.local" });

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function list(name: string): string[] {
  return arg(name, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

interface CriterionResult {
  id: string;
  passed: boolean;
  label?: string;
  evidence?: string;
}
interface TaskFields {
  template_code: string | null;
  title: string;
  description: string | null;
  detailed_instructions: string | null;
  deliverables: string[] | null;
  peer_review_criteria: unknown;
  review_instructions: string | null;
  is_recurring: boolean | null;
}

function failedIds(results: unknown): string[] {
  return ((results ?? []) as CriterionResult[])
    .filter((c) => c.passed === false)
    .map((c) => c.id);
}

async function main() {
  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: settingsRow } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", "ai_review")
    .single();
  const settings = parseAiReviewSettings(settingsRow?.value);
  settings.model = arg("model", settings.model);

  const ids = list("ids");
  const codes = list("codes");
  const sole = arg("sole", "");
  const status = arg("status", "rejected");
  const limit = Number(arg("limit", "40"));
  const fresh = flag("fresh-criteria");

  const select = `id, user_id, created_at, status, decision, confidence, criteria_results, feedback, submission_snapshot, criteria_snapshot, tasks!inner(template_code, title, description, detailed_instructions, deliverables, peer_review_criteria, review_instructions, is_recurring)`;
  let query = admin
    .from("ai_task_reviews")
    .select(select)
    .order("created_at", { ascending: false })
    .limit(ids.length ? ids.length : 500);
  if (ids.length) query = query.in("id", ids);
  else if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? [])
    .filter((r) => {
      if (ids.length) return true;
      const t = r.tasks as unknown as TaskFields;
      if (codes.length && !codes.some((c) => t.template_code?.startsWith(c)))
        return false;
      if (sole) {
        const failed = failedIds(r.criteria_results);
        if (failed.length !== 1 || failed[0] !== sole) return false;
      }
      return true;
    })
    .slice(0, limit);

  console.log(
    `${rows.length} rows · model ${settings.model} · criteria ${fresh ? "FRESH (tasks table)" : "snapshot"}`
  );
  const results: Array<Record<string, unknown>> = [];
  let cost = 0;

  for (const [i, r] of rows.entries()) {
    const t = r.tasks as unknown as TaskFields;
    const snapshotCriteria = r.criteria_snapshot as unknown as CriteriaSnapshot;
    const criteria: CriteriaSnapshot = fresh
      ? {
          title: t.title,
          description: t.description,
          detailed_instructions: t.detailed_instructions,
          deliverables: t.deliverables ?? [],
          review_instructions: t.review_instructions,
          is_recurring: t.is_recurring ?? false,
          previous_submissions: flag("no-previous")
            ? []
            : (snapshotCriteria?.previous_submissions ?? []),
          criteria: Array.isArray(t.peer_review_criteria)
            ? (t.peer_review_criteria as CriteriaSnapshot["criteria"])
            : [],
        }
      : snapshotCriteria;
    const submission = r.submission_snapshot as unknown as NormalizedSubmission;
    const before = r.status;
    const started = Date.now();
    try {
      const out = await runReviewOnSnapshot(submission, criteria, settings, {
        deadlineAt: Date.now() + 270_000,
      });
      cost += out.costUsd;
      const after = out.outcome;
      results.push({
        review_id: r.id,
        code: t.template_code,
        task: t.title,
        before,
        after,
        changed: before !== after,
        failed_before: failedIds(r.criteria_results).join(" "),
        failed_after: failedIds(out.result?.criteria).join(" "),
        reject_reason: out.rejectReason,
        confidence: out.result?.confidence,
        cost_usd: out.costUsd,
        ms: Date.now() - started,
        feedback: out.feedback,
        submission: submission.description?.slice(0, 400),
      });
      console.log(
        `${i + 1}/${rows.length} ${t.template_code?.padEnd(10)} ${before.padEnd(8)} → ${after.padEnd(8)} conf=${out.result?.confidence?.toFixed(2)} fails=[${failedIds(out.result?.criteria).join(",")}] $${out.costUsd}`
      );
    } catch (e) {
      results.push({
        review_id: r.id,
        code: t.template_code,
        task: t.title,
        before,
        after: "error",
        error: e instanceof Error ? e.message : String(e),
      });
      console.log(
        `${i + 1}/${rows.length} ${t.template_code} ERROR ${e instanceof Error ? e.message : e}`
      );
    }
  }

  const scored = results.filter((r) => r.after !== "error");
  const summary = {
    n: results.length,
    errors: results.length - scored.length,
    now_approved: scored.filter((r) => r.after === "approved").length,
    now_rejected: scored.filter((r) => r.after === "rejected").length,
    changed: scored.filter((r) => r.changed).length,
    total_cost_usd: Number(cost.toFixed(3)),
    model: settings.model,
    criteria: fresh ? "fresh" : "snapshot",
  };
  console.table(summary);

  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 13);
  mkdirSync("reports", { recursive: true });
  const file = `reports/ai-review-replay-${stamp}.json`;
  writeFileSync(file, JSON.stringify({ summary, results }, null, 2));
  console.log(`wrote ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
